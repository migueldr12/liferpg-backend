const { validationError } = require('../../../../shared/errors/AppError');
const { FAIL_REASONS, LIMITS, MISSION_STATUS, MISSION_TYPES } = require('../../domain/entities/Mission');

// Validan y normalizan lo que llega en params, query y body.
// Cada error se reporta por campo: { details: { campo: "mensaje" } }.

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const HISTORY_STATUS = [MISSION_STATUS.COMPLETED, MISSION_STATUS.FAILED];

function check(errors) {
  if (Object.keys(errors).length) throw validationError(errors);
}

const isInt = (v) => Number.isInteger(v);
const toInt = (v) => (v === undefined || v === '' ? undefined : Number(v));

function parseId(value, field) {
  if (typeof value !== 'string' || !OBJECT_ID.test(value)) throw validationError({ [field]: 'Identificador no válido.' });
  return value;
}

function parseType(value, errors, { required }) {
  if (value === undefined || value === '') {
    if (required) errors.type = 'Elige un tipo: cultura, fisico o enfoque.';
    return undefined;
  }
  if (!MISSION_TYPES.includes(value)) errors.type = 'El tipo debe ser cultura, fisico o enfoque.';
  return value;
}

function parseDuration(value, errors) {
  if (!isInt(value) || value < LIMITS.durationMin || value > LIMITS.durationMax) {
    errors.durationMin = `La duración debe ser un entero de ${LIMITS.durationMin} a ${LIMITS.durationMax} minutos.`;
  }
  return value;
}

// POST /misiones
function parseCreateMission(body = {}) {
  const errors = {};
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) errors.title = 'Escribe un título para la misión.';
  else if (title.length > LIMITS.titleMax) errors.title = `El título admite hasta ${LIMITS.titleMax} caracteres.`;
  const type = parseType(body.type, errors, { required: true });
  const durationMin = parseDuration(body.durationMin, errors);
  check(errors);
  return { title, type, durationMin };
}

// GET /misiones?estado=activa&tipo=  (estado es opcional; las terminadas van en /historial)
function parseActiveQuery(query = {}) {
  const errors = {};
  if (query.estado !== undefined && query.estado !== MISSION_STATUS.ACTIVE) {
    errors.estado = 'Aquí solo se consultan las misiones activas; las terminadas están en /misiones/historial.';
  }
  const type = parseType(query.tipo, errors, { required: false });
  check(errors);
  return { type };
}

// GET /misiones/recompensa?tipo=&duracion=
function parseRewardQuery(query = {}) {
  const errors = {};
  const type = parseType(query.tipo, errors, { required: true });
  const durationMin = parseDuration(toInt(query.duracion), errors);
  check(errors);
  return { type, durationMin };
}

function parseDate(value, field, errors) {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) errors[field] = 'Usa una fecha ISO 8601, por ejemplo 2026-11-01.';
  return date;
}

// GET /misiones/historial?estado=&tipo=&desde=&hasta=&limite=
function parseHistoryQuery(query = {}) {
  const errors = {};
  let status;
  if (query.estado !== undefined && query.estado !== '') {
    if (HISTORY_STATUS.includes(query.estado)) status = query.estado;
    else errors.estado = 'El estado debe ser completada o fallida.';
  }
  const type = parseType(query.tipo, errors, { required: false });
  const from = parseDate(query.desde, 'desde', errors);
  const to = parseDate(query.hasta, 'hasta', errors);
  if (from && to && from > to) errors.hasta = 'La fecha final debe ser posterior a la inicial.';
  const limit = toInt(query.limite) ?? 50;
  if (!isInt(limit) || limit < 1 || limit > 100) errors.limite = 'El límite debe ser de 1 a 100.';
  check(errors);
  return { status, type, from, to, limit };
}

// POST /sesiones/:sessionId/fallar
function parseAbandon(body = {}) {
  const reason = body.reason ?? 'rendicion';
  if (!FAIL_REASONS.includes(reason)) throw validationError({ reason: 'El motivo debe ser rendicion o salio_app.' });
  return { reason };
}

// POST /sesiones/:sessionId/finalizar — el cuerpo es opcional. Cuando la app lea el
// smartwatch (development build) mandará { activity } con la forma de WearableActivity (RDF043).
function parseFinish(body = {}) {
  if (body?.activity === undefined || body.activity === null) return {};
  const a = body.activity;
  const errors = {};
  if (!isInt(a.steps) || a.steps < 0) errors['activity.steps'] = 'Los pasos deben ser un entero mayor o igual a 0.';
  if (typeof a.distanceKm !== 'number' || a.distanceKm < 0) errors['activity.distanceKm'] = 'La distancia debe ser un número mayor o igual a 0.';
  if (!isInt(a.activeMin) || a.activeMin < 0) errors['activity.activeMin'] = 'Los minutos activos deben ser un entero mayor o igual a 0.';
  check(errors);
  return { activity: { steps: a.steps, distanceKm: a.distanceKm, activeMin: a.activeMin } };
}

module.exports = {
  parseId,
  parseCreateMission,
  parseActiveQuery,
  parseRewardQuery,
  parseHistoryQuery,
  parseAbandon,
  parseFinish,
};
