const crypto = require('crypto');
const { conflict, forbidden, notFound } = require('../../../../shared/errors/AppError');
const { VinculacionEntity, MAX_PARTY_SIZE } = require('../../domain/entities/Vinculacion.entity');
const { VisualizadorMapper } = require('../../infrastructure/mappers/Visualizador.mapper');
const { GenerarCodigoDTO } = require('../dtos/GenerarCodigo.dto');
const { CanjearCodigoDTO } = require('../dtos/CanjearCodigo.dto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeString() {
  const bytes = crypto.randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i += 1) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `DRG-${suffix}`;
}

class GestionarCodigosService {
  constructor(visualizadorRepository) {
    this.visualizadorRepository = visualizadorRepository;
  }

  async listMyCodes(userId) {
    const entities = await this.visualizadorRepository.listCodesByUser(userId);
    const items = entities.map((entity) => VisualizadorMapper.codeToResponse(entity));
    const vigentes = items.filter((c) => c.estado === 'Vigente').length;

    return {
      vigentes,
      codigos: items,
    };
  }

  async generate(userId, rawBody) {
    const dto = new GenerarCodigoDTO(rawBody);
    const expiresAt = new Date(Date.now() + dto.expirationHours * 60 * 60 * 1000);

    let code = randomCodeString();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await this.visualizadorRepository.findCodeByString(code);
      if (!exists) break;
      code = randomCodeString();
    }

    const created = await this.visualizadorRepository.createFriendCode({
      userId,
      code,
      maxUses: dto.maxUses,
      uses: 0,
      expiresAt,
    });

    return VisualizadorMapper.codeToResponse(created);
  }

  async revoke(userId, codeId) {
    const entity = await this.visualizadorRepository.findCodeById(codeId);
    if (!entity) {
      throw notFound('No se encontró el código de amistad.');
    }
    if (String(entity.userId) !== String(userId)) {
      throw forbidden('No puedes revocar un código que no creaste.');
    }
    if (entity.revokedAt) {
      throw conflict('Este código ya fue revocado.');
    }

    const revoked = await this.visualizadorRepository.revokeCode(codeId);
    return VisualizadorMapper.codeToResponse(revoked);
  }

  async redeem(redeemerId, rawBody) {
    const dto = new CanjearCodigoDTO(rawBody);
    const codeEntity = await this.visualizadorRepository.findCodeByString(dto.code);

    if (!codeEntity) {
      throw notFound('El código ingresado no existe.');
    }
    if (String(codeEntity.userId) === String(redeemerId)) {
      throw conflict('No puedes canjear tu propio código de amistad.');
    }
    if (!codeEntity.canBeRedeemed()) {
      throw conflict(`El código no está disponible (estado: ${codeEntity.getStatus()}).`);
    }

    const existingFriendship = await this.visualizadorRepository.findAcceptedFriendshipBetween(
      redeemerId,
      codeEntity.userId
    );
    if (existingFriendship) {
      throw conflict('Este aventurero ya forma parte de tu party.');
    }

    const [redeemerCount, ownerCount] = await Promise.all([
      this.visualizadorRepository.countAcceptedFriends(redeemerId),
      this.visualizadorRepository.countAcceptedFriends(codeEntity.userId),
    ]);

    if (redeemerCount >= MAX_PARTY_SIZE) {
      throw conflict(`Ya alcanzaste el límite máximo de ${MAX_PARTY_SIZE} amigos en tu party.`);
    }
    if (ownerCount >= MAX_PARTY_SIZE) {
      throw conflict('El dueño de este código ya alcanzó su límite de 30 amigos.');
    }

    const pairKey = VinculacionEntity.buildPairKey(codeEntity.userId, redeemerId);
    const { code, friendship } = await this.visualizadorRepository.redeemCodeAndCreateFriendship({
      codeRecord: codeEntity,
      redeemerId,
      pairKey,
    });

    return {
      linked: true,
      friendshipId: friendship.id,
      friendId: code.userId,
      code: code.code,
    };
  }
}

module.exports = { GestionarCodigosService };