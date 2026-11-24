const { notFound, validationError } = require('../../../../shared/errors/AppError');
const { NOTE_MAX, ORIGINS, RANGES, STATUSES, TYPES, parseActivityId } = require('../../domain/entities/Activity');

// Validan y normalizan lo que llega en params, query y body.
// Cada error se reporta por campo: { details: { campo: "mensaje" } }.

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function check(errors) {
  if (Object.keys(errors).length) throw validationError(errors);
}

function oneOf(value, options, field, message, errors) {
  if (value === undefined || value === '') return null;
  if (!options.includes(value)) errors[field] = message;
  return value;
}

// GET /diario/actividades?tipo=&origen=&estado=&desde=
function parseListQuery(query = {}) {
  const errors = {};
  const type = oneOf(query.tipo, TYPES, 'tipo', 'El tipo debe ser cultura, fisico o enfoque.', errors);
  const origin = oneOf(query.origen, ORIGINS, 'origen', 'El origen debe ser habito, mision o sesion.', errors);
  const status = oneOf(query.estado, STATUSES, 'estado', 'El estado debe ser hecha, pendiente o fallida.', errors);
  let since = null;
  if (query.desde !== undefined && query.desde !== '') {
    since = new Date(query.desde);
    if (Number.isNaN(since.getTime())) errors.desde = 'Usa una fecha ISO 8601, por ejemplo 2026-11-01.';
  }
  check(errors);
  return { type, origin, status, since };
}

// :id de una actividad. Un id que no tiene la forma de ninguna actividad no existe: 404
function parseActivityParam(value) {
  if (!parseActivityId(value)) throw notFound('No encontramos esa actividad.');
  return value.toLowerCase();
}

function parseNoteId(value) {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) throw notFound('La nota ya no existe.');
  return value.toLowerCase();
}

// Cuerpo de una nota: { "text": "…" }
function parseNoteBody(body = {}, { editing = false } = {}) {
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) throw validationError({ text: editing ? 'La nota no puede quedar vacía.' : 'Escribe algo en la nota.' });
  if (text.length > NOTE_MAX) throw validationError({ text: `La nota admite hasta ${NOTE_MAX} caracteres.` });
  return text;
}

// GET /diario/graficas/…?rango=semana|mes|anio  (semana si no viene)
function parseRange(query = {}) {
  const errors = {};
  const range = oneOf(query.rango, RANGES, 'rango', 'El rango debe ser semana, mes o anio.', errors) ?? 'semana';
  check(errors);
  return range;
}

module.exports = { parseListQuery, parseActivityParam, parseNoteId, parseNoteBody, parseRange };
