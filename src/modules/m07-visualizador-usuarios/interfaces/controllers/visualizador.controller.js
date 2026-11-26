const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { badRequest } = require('../../../../shared/errors/AppError');
const { PrismaVisualizadorRepository } = require('../../infrastructure/repositories/PrismaVisualizadorRepository');
const { GetListaPartyService } = require('../../application/services/GetListaParty.service');
const { GetPerfilEspejoService } = require('../../application/services/GetPerfilEspejo.service');
const { GestionarCodigosService } = require('../../application/services/GestionarCodigos.service');

const repository = new PrismaVisualizadorRepository();
const getListaPartyService = new GetListaPartyService(repository);
const getPerfilEspejoService = new GetPerfilEspejoService(repository);
const gestionarCodigosService = new GestionarCodigosService(repository);

function resolveUserId(req) {
  const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
  if (!userId) {
    throw badRequest('Falta el identificador del usuario (token JWT o header x-user-id).');
  }
  return userId;
}

const getParty = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const result = await getListaPartyService.execute(userId, {
    q: req.query.q,
    sort: req.query.sort,
  });
  res.json(result);
});

const removeFriend = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const result = await getListaPartyService.removeFriend(userId, req.params.friendId);
  res.json(result);
});

const getPerfilEspejo = asyncHandler(async (req, res) => {
  const viewerId = resolveUserId(req);
  const result = await getPerfilEspejoService.execute(viewerId, req.params.friendId);
  res.json(result);
});

const listCodigos = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const result = await gestionarCodigosService.listMyCodes(userId);
  res.json(result);
});

const createCodigo = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const created = await gestionarCodigosService.generate(userId, req.body);
  res.status(201).json(created);
});

const revokeCodigo = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const revoked = await gestionarCodigosService.revoke(userId, req.params.codeId);
  res.json(revoked);
});

const redeemCodigo = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  const result = await gestionarCodigosService.redeem(userId, req.body);
  res.status(201).json(result);
});

module.exports = {
  getParty,
  removeFriend,
  getPerfilEspejo,
  listCodigos,
  createCodigo,
  revokeCodigo,
  redeemCodigo,
};