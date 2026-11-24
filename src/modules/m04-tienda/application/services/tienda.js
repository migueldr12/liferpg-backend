const { badRequest, notFound } = require('../../../../shared/errors/AppError');
const {
  pointTypeToDb,
  toShopItemDto,
  toCustomRewardDto,
  toOwnedRewardDto,
  toClothingDto,
} = require('../../infrastructure/mappers/tiendaMapper');

// Casos de uso del M04 · Tienda (RDF048 a RDF056).
// Las reglas de negocio viven aquí; el repositorio solo lee y escribe en MongoDB.

const NAME_MAX = 30;
const DESCRIPTION_MAX = 80;
const POINT_TYPES = ['cultura', 'fisico', 'enfoque'];

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const toWallet = (profile) => ({
  cultura: profile?.culturePoints ?? 0,
  fisico: profile?.physicalPoints ?? 0,
  enfoque: profile?.focusPoints ?? 0,
});

const parsePrice = (value) => {
  const price = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(price) || price <= 0) {
    throw badRequest('El precio debe ser un entero mayor a 0.');
  }
  return price;
};

const normalizeReward = async (input, economyService) => {
  const name = cleanText(input?.name);
  if (!name) throw badRequest('Escribe el nombre de la recompensa.');
  if (name.length > NAME_MAX) throw badRequest(`El nombre no puede pasar de ${NAME_MAX} caracteres.`);

  const description = cleanText(input?.description);
  if (description.length > DESCRIPTION_MAX) {
    throw badRequest(`Los detalles no pueden pasar de ${DESCRIPTION_MAX} caracteres.`);
  }

  const icon = cleanText(input?.icon);
  if (!icon) throw badRequest('Elige un ícono.');

  const pointType = POINT_TYPES.includes(input?.pointType) ? input.pointType : null;
  if (!pointType) throw badRequest('Elige con qué puntos se paga.');

  const price = parsePrice(input?.price);
  const economy = await economyService.consultarEconomiaActiva();
  const min = economy.rewardPrice.min;
  const max = economy.rewardPrice.max;
  if (price < min || price > max) {
    throw badRequest(`El precio debe estar entre ${min} y ${max} puntos.`);
  }

  return {
    name,
    description,
    icon,
    pointType: pointTypeToDb(pointType),
    price,
    consumable: Boolean(input?.consumable),
  };
};

// GET /tienda/articulos
function makeConsultarArticulos({ repository }) {
  return async function consultarArticulos(userId) {
    return (await repository.listShopItems(userId)).map(toShopItemDto);
  };
}

// POST /tienda/compras
// El servidor valida los puntos del tipo del artículo y los descuenta (RDF050).
function makeComprarArticulo({ repository }) {
  return async function comprarArticulo(userId, itemId) {
    if (typeof itemId !== 'string' || !itemId.trim()) {
      throw badRequest('Elige el artículo que quieres comprar.');
    }

    const item = await repository.findShopItem(userId, itemId.trim());
    if (!item) throw notFound('El artículo ya no está disponible.');
    if (!item.pointType) throw badRequest('El artículo no tiene un tipo de puntos configurado.');
    if (!Number.isInteger(item.price) || item.price < 0) {
      throw badRequest('El precio del artículo no es válido.');
    }

    const { profile, entry } = await repository.purchase(userId, item);

    // Ropa y fondos entran al vestidor; el resto, a las recompensas del inventario.
    // El contrato (PurchaseResult) siempre trae `reward`; en ropa, su subtítulo avisa
    // que ya está en el vestidor.
    const reward = item.slot
      ? { ...toClothingDto(item, entry), subtitle: 'Comprada · ya está en tu vestidor' }
      : toOwnedRewardDto(item, entry);

    return { wallet: toWallet(profile), reward };
  };
}

// GET /tienda/precio-sugerido
// El rango permitido lo pone la economía global (M14 · RDF054); el sugerido sube
// poco a poco con el nivel del jugador.
function makeConsultarPrecioSugerido({ repository, economyService }) {
  return async function consultarPrecioSugerido(userId) {
    const [profile, economy] = await Promise.all([
      repository.getProfile(userId),
      economyService.consultarEconomiaActiva(),
    ]);
    const level = profile?.level ?? 1;
    const factor = Math.min(2, 1 + Math.max(0, level - 1) * 0.05);
    const min = economy.rewardPrice.min;
    const max = economy.rewardPrice.max;

    return {
      level,
      min: Math.round(min * factor),
      max: Math.round(max * factor),
      allowedMin: min,
      allowedMax: max,
    };
  };
}

// POST /tienda/recompensas
function makeCrearRecompensa({ repository, economyService }) {
  return async function crearRecompensa(userId, input) {
    const data = await normalizeReward(input, economyService);
    return toShopItemDto(await repository.createCustomReward(userId, data));
  };
}

// GET /tienda/recompensas/:id
function makeConsultarRecompensa({ repository }) {
  return async function consultarRecompensa(userId, id) {
    const item = await repository.findCustomReward(userId, id);
    if (!item) throw notFound('La recompensa ya no existe.');
    return toCustomRewardDto(item);
  };
}

// PUT /tienda/recompensas/:id (RDF055)
function makeActualizarRecompensa({ repository, economyService }) {
  return async function actualizarRecompensa(userId, id, input) {
    const current = await repository.findCustomReward(userId, id);
    if (!current) throw notFound('La recompensa ya no existe.');
    const data = await normalizeReward(input, economyService);
    return toShopItemDto(await repository.updateCustomReward(id, data));
  };
}

// DELETE /tienda/recompensas/:id (RDF056)
function makeEliminarRecompensa({ repository }) {
  return async function eliminarRecompensa(userId, id) {
    const current = await repository.findCustomReward(userId, id);
    if (!current) throw notFound('La recompensa ya no existe.');
    await repository.deleteCustomReward(id);
  };
}

module.exports = {
  makeConsultarArticulos,
  makeComprarArticulo,
  makeConsultarPrecioSugerido,
  makeCrearRecompensa,
  makeConsultarRecompensa,
  makeActualizarRecompensa,
  makeEliminarRecompensa,
};
