// Validadores de entrada del M00: revisan la FORMA del body. Las reglas (rangos, listas
// válidas) las revisa la entidad Account.

const { ValidationError } = require('../../domain/errors');

const fail = (next, message) => next(new ValidationError(message));
const isString = (v) => typeof v === 'string';
const isStringList = (v) => Array.isArray(v) && v.every(isString);

function validarNuevaCuenta(req, res, next) {
  const { firstName, lastName, age, gender, goals, customGoal } = req.body ?? {};
  if (!isString(firstName) || !isString(lastName)) return fail(next, 'Escribe tu nombre y tu apellido.');
  if (typeof age !== 'number') return fail(next, '"age" es obligatorio y debe ser un número.');
  if (!isString(gender)) return fail(next, 'Elige una opción de género.');
  if (!isStringList(goals)) return fail(next, '"goals" debe ser una lista de metas.');
  if (customGoal !== undefined && customGoal !== null && !isString(customGoal)) return fail(next, '"customGoal" debe ser texto o null.');
  next();
}

function validarCambiosCuenta(req, res, next) {
  const b = req.body ?? {};
  const campos = ['firstName', 'lastName', 'age', 'gender', 'goals', 'customGoal', 'photoUrl', 'petColor'];
  if (!campos.some((c) => b[c] !== undefined)) return fail(next, 'No hay cambios que guardar.');
  if (b.age !== undefined && typeof b.age !== 'number') return fail(next, '"age" debe ser un número.');
  if (b.goals !== undefined && !isStringList(b.goals)) return fail(next, '"goals" debe ser una lista de metas.');
  for (const c of ['firstName', 'lastName', 'gender', 'petColor']) {
    if (b[c] !== undefined && !isString(b[c])) return fail(next, `"${c}" debe ser texto.`);
  }
  for (const c of ['customGoal', 'photoUrl']) {
    if (b[c] !== undefined && b[c] !== null && !isString(b[c])) return fail(next, `"${c}" debe ser texto o null.`);
  }
  next();
}

function validarMascota(req, res, next) {
  if (!isString(req.body?.pet)) return fail(next, 'Elige tu mascota.');
  next();
}

module.exports = { validarNuevaCuenta, validarCambiosCuenta, validarMascota };
