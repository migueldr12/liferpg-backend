const { validationError } = require('../../../../shared/errors/AppError');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const isObjectId = (v) => typeof v === 'string' && OBJECT_ID.test(v);
const fail = (details) => {
  throw validationError(details);
};

function parseId(value, field) {
  if (!isObjectId(value)) fail({ [field]: `El campo ${field} no es un identificador válido.` });
  return value;
}

function parseBool(value) {
  return value === true || value === 'true' || value === '1';
}

function parsePaging(query, { defaultLimit = 20, maxLimit = 50 } = {}) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) fail({ page: 'page debe ser un entero mayor o igual a 1.' });
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) fail({ limit: `limit debe estar entre 1 y ${maxLimit}.` });
  return { page, limit };
}

function oneOf(value, allowed, field, fallback) {
  if (value === undefined) return fallback;
  if (!allowed.includes(value)) fail({ [field]: `${field} debe ser uno de: ${allowed.join(', ')}.` });
  return value;
}

// POST /stickers
function validateSendSticker(body = {}) {
  const raw = body.recipientIds ?? (body.recipientId ? [body.recipientId] : undefined);
  if (!Array.isArray(raw) || raw.length === 0) fail({ recipientIds: 'Elige al menos un amigo.' });
  if (raw.length > 20) fail({ recipientIds: 'Puedes enviar a un máximo de 20 amigos a la vez.' });
  raw.forEach((id) => parseId(id, 'recipientIds'));

  const catalogItemId = parseId(body.catalogItemId, 'catalogItemId');

  let message;
  if (body.message !== undefined && body.message !== null) {
    if (typeof body.message !== 'string') fail({ message: 'El mensaje debe ser texto.' });
    message = body.message.trim() || undefined;
    if (message && message.length > 140) fail({ message: 'El mensaje no puede pasar de 140 caracteres.' });
  }
  return { recipientIds: [...new Set(raw)], catalogItemId, message };
}

// GET /stickers/catalogo
function validateCatalogQuery(query) {
  return { categoryId: query.categoryId === undefined ? undefined : parseId(query.categoryId, 'categoryId') };
}

// GET /stickers/historial
function validateHistoryQuery(query) {
  return {
    direction: oneOf(query.tipo, ['enviados', 'recibidos', 'todos'], 'tipo', 'todos'),
    friendId: query.friendId === undefined ? undefined : parseId(query.friendId, 'friendId'),
    onlyUnseen: parseBool(query.soloNoVistos),
    ...parsePaging(query),
  };
}

// PATCH /stickers/visto
function validateMarkSeenBody(body = {}) {
  if (body.ids === undefined) return { ids: undefined };
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100) {
    fail({ ids: 'ids debe ser una lista de 1 a 100 identificadores.' });
  }
  body.ids.forEach((id) => parseId(id, 'ids'));
  return { ids: [...new Set(body.ids)] };
}

// GET /avisos-inactividad
function validateAlertsQuery(query) {
  return {
    scope: oneOf(query.alcance, ['propios', 'amigos', 'todos'], 'alcance', 'todos'),
    includeResolved: parseBool(query.incluirResueltos),
    ...parsePaging(query),
  };
}

// POST /inactividad/ejecutar
function validateRunBody(body = {}) {
  const options = { dryRun: parseBool(body.dryRun) };
  if (body.thresholdDays !== undefined) {
    if (!Number.isInteger(body.thresholdDays) || body.thresholdDays < 1 || body.thresholdDays > 365) {
      fail({ thresholdDays: 'thresholdDays debe ser un entero entre 1 y 365.' });
    }
    options.thresholdDays = body.thresholdDays;
  }
  if (body.lowRate !== undefined) {
    if (typeof body.lowRate !== 'number' || body.lowRate <= 0 || body.lowRate > 1) {
      fail({ lowRate: 'lowRate debe ser un número mayor que 0 y hasta 1.' });
    }
    options.lowRate = body.lowRate;
  }
  return options;
}

module.exports = {
  isObjectId,
  parseId,
  validateSendSticker,
  validateCatalogQuery,
  validateHistoryQuery,
  validateMarkSeenBody,
  validateAlertsQuery,
  validateRunBody,
};
