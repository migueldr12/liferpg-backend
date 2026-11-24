const { notFound, validationError } = require('../../../../shared/errors/AppError');
const { DIRECTIONS, MESSAGE_MAX } = require('../../domain/entities/Botin');

// Validan y normalizan lo que llega en params, query y body.
// Cada error se reporta por campo: { details: { campo: "mensaje" } }.

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const isId = (v) => typeof v === 'string' && OBJECT_ID.test(v);

function check(errors) {
  if (Object.keys(errors).length) throw validationError(errors);
}

function optionalText(value, field, errors) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    errors[field] = 'Escribe el mensaje como texto.';
    return null;
  }
  const text = value.trim();
  if (text.length > MESSAGE_MAX) errors[field] = `El mensaje admite hasta ${MESSAGE_MAX} caracteres.`;
  return text || null;
}

// POST /botin/regalos  { friendId, itemId, message? }
function parseGift(body = {}) {
  const errors = {};
  if (!isId(body?.friendId)) errors.friendId = 'Elige a qué amigo enviarle el regalo.';
  if (!isId(body?.itemId)) errors.itemId = 'Elige qué objeto regalar.';
  const message = optionalText(body?.message, 'message', errors);
  check(errors);
  return { friendId: body.friendId.toLowerCase(), itemId: body.itemId.toLowerCase(), message };
}

// POST /botin/solicitudes  { friendId, itemId, reason? }
function parseRequest(body = {}) {
  const errors = {};
  if (!isId(body?.friendId)) errors.friendId = 'Elige a qué amigo pedirle.';
  if (!isId(body?.itemId)) errors.itemId = 'Elige qué objeto pedir.';
  const reason = optionalText(body?.reason, 'reason', errors);
  check(errors);
  return { friendId: body.friendId.toLowerCase(), itemId: body.itemId.toLowerCase(), reason };
}

// POST /botin/solicitudes/:id  { accept: true | false }
function parseAnswer(body = {}) {
  if (typeof body?.accept !== 'boolean') throw validationError({ accept: 'Indica si aceptas (true) o rechazas (false) la solicitud.' });
  return body.accept;
}

// :id que no tiene forma de id no existe: 404
function parseId(value, message) {
  if (!isId(value)) throw notFound(message);
  return value.toLowerCase();
}

// GET /botin/historial?tipo=enviado|recibido&amigo=:id&desde=:fecha
function parseHistoryQuery(query = {}) {
  const errors = {};
  let direction = null;
  let friendId = null;
  let since = null;
  if (query.tipo !== undefined && query.tipo !== '') {
    if (!DIRECTIONS.includes(query.tipo)) errors.tipo = 'El tipo debe ser enviado o recibido.';
    else direction = query.tipo;
  }
  if (query.amigo !== undefined && query.amigo !== '') {
    if (!isId(query.amigo)) errors.amigo = 'Amigo no válido.';
    else friendId = query.amigo.toLowerCase();
  }
  if (query.desde !== undefined && query.desde !== '') {
    since = new Date(query.desde);
    if (Number.isNaN(since.getTime())) errors.desde = 'Usa una fecha ISO 8601, por ejemplo 2026-11-01.';
  }
  check(errors);
  return { direction, friendId, since };
}

module.exports = { parseGift, parseRequest, parseAnswer, parseId, parseHistoryQuery };
