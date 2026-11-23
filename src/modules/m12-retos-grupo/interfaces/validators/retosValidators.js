// Validadores de entrada del M12: revisan la FORMA del body y del query. Las reglas
// del negocio (fechas, metas, amigos) las revisan la entidad y los servicios.

const { ValidationError } = require('../../domain/errors');

const fail = (next, message) => next(new ValidationError(message));
const isString = (v) => typeof v === 'string';

function validarNuevoReto(req, res, next) {
  const { title, type, metric, goal, deadline, invited } = req.body ?? {};
  if (!isString(title)) return fail(next, '"title" es obligatorio.');
  if (!isString(type)) return fail(next, '"type" es obligatorio (cultura, fisico o enfoque).');
  if (!isString(metric)) return fail(next, '"metric" es obligatorio (habitos, misiones, minutos o xp).');
  if (typeof goal !== 'number') return fail(next, '"goal" es obligatorio y debe ser un número.');
  if (!isString(deadline)) return fail(next, '"deadline" es obligatorio (AAAA-MM-DD).');
  if (!(Array.isArray(invited) && invited.every(isString))) return fail(next, '"invited" debe ser una lista de ids de amigos.');
  next();
}

function validarRespuesta(req, res, next) {
  if (typeof req.body?.accept !== 'boolean') return fail(next, '"accept" debe ser true (unirse) o false (rechazar).');
  next();
}

function validarPeriodo(req, res, next) {
  if (!['semana', 'mes'].includes(req.query.periodo)) return fail(next, 'Usa ?periodo=semana o ?periodo=mes.');
  next();
}

function validarArea(req, res, next) {
  if (!['cultura', 'fisico', 'enfoque'].includes(req.query.area)) return fail(next, 'Usa ?area=cultura, fisico o enfoque.');
  next();
}

module.exports = { validarNuevoReto, validarRespuesta, validarPeriodo, validarArea };
