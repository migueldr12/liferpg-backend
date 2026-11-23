// Validadores de entrada del M14: revisan la FORMA del body (que los campos existan y
// tengan el tipo correcto). Las reglas del negocio (rangos, límites, duplicados) las
// revisan las entidades y los servicios. Si algo falla pasan un ValidationError (400).

const { ValidationError } = require('../../domain/errors');

const fail = (next, message) => next(new ValidationError(message));
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isString = (v) => typeof v === 'string';

function validarPublicacion(req, res, next) {
  const { base, exponent, difficultyPoints, rewardPrice } = req.body ?? {};
  if (typeof base !== 'number') return fail(next, '"base" es obligatorio y debe ser un número.');
  if (typeof exponent !== 'number') return fail(next, '"exponent" es obligatorio y debe ser un número.');
  if (!isObject(difficultyPoints)) return fail(next, '"difficultyPoints" debe traer los puntos de facil, media, dificil y epica.');
  if (!isObject(rewardPrice)) return fail(next, '"rewardPrice" debe traer min y max.');
  next();
}

function validarCategoria(req, res, next) {
  const { name, type, icon } = req.body ?? {};
  if (!isString(name)) return fail(next, '"name" es obligatorio.');
  if (!isString(type)) return fail(next, '"type" es obligatorio.');
  if (!isString(icon)) return fail(next, '"icon" es obligatorio.');
  next();
}

function validarArticuloNuevo(req, res, next) {
  const { name, group, icon, price, tag, tags } = req.body ?? {};
  if (!isString(name)) return fail(next, '"name" es obligatorio.');
  if (!isString(group)) return fail(next, '"group" es obligatorio.');
  if (!isString(icon)) return fail(next, '"icon" es obligatorio.');
  if (typeof price !== 'number') return fail(next, '"price" es obligatorio y debe ser un número.');
  if (tag !== undefined && tag !== null && !isString(tag)) return fail(next, '"tag" debe ser texto.');
  if (tags !== undefined && !(Array.isArray(tags) && tags.every(isString))) return fail(next, '"tags" debe ser una lista de textos.');
  next();
}

function validarCambiosArticulo(req, res, next) {
  const { name, icon, price, tags, active } = req.body ?? {};
  if ([name, icon, price, tags, active].every((v) => v === undefined)) {
    return fail(next, 'Envía al menos uno: name, icon, price, tags o active.');
  }
  if (name !== undefined && !isString(name)) return fail(next, '"name" debe ser texto.');
  if (icon !== undefined && !isString(icon)) return fail(next, '"icon" debe ser texto.');
  if (price !== undefined && typeof price !== 'number') return fail(next, '"price" debe ser un número.');
  if (tags !== undefined && !(Array.isArray(tags) && tags.every(isString))) return fail(next, '"tags" debe ser una lista de textos.');
  if (active !== undefined && typeof active !== 'boolean') return fail(next, '"active" debe ser true o false.');
  next();
}

function validarPush(req, res, next) {
  const { title, message, target } = req.body ?? {};
  if (!isString(title)) return fail(next, '"title" es obligatorio.');
  if (!isString(message)) return fail(next, '"message" es obligatorio.');
  if (!isObject(target) || !isString(target.kind)) return fail(next, '"target" debe ser { kind: "todos" } o { kind: "usuario", username }.');
  if (target.kind === 'usuario' && !isString(target.username)) return fail(next, 'Escribe el usuario que recibirá el aviso.');
  next();
}

module.exports = {
  validarPublicacion,
  validarCategoria,
  validarArticuloNuevo,
  validarCambiosArticulo,
  validarPush,
};
