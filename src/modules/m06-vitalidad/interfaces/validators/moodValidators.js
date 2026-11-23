// Validadores de entrada del M06: revisan la FORMA del body/query antes de llegar
// al caso de uso (que el campo exista y sea del tipo correcto). Las reglas del
// negocio (rangos, límites) las vuelve a revisar la entidad en el dominio.
// Cada validador es un middleware de Express: si falla pasa un ValidationError (400).

const { ValidationError } = require('../../domain/errors');

const fail = (next, message) => next(new ValidationError(message));

function validarRegistroAnimo(req, res, next) {
  const { mood, energy, factors } = req.body ?? {};
  if (!Number.isInteger(mood)) return fail(next, '"mood" es obligatorio y debe ser un número entero.');
  if (!Number.isInteger(energy)) return fail(next, '"energy" es obligatorio y debe ser un número entero.');
  if (factors !== undefined && !(Array.isArray(factors) && factors.every((f) => typeof f === 'string'))) {
    return fail(next, '"factors" debe ser una lista de textos.');
  }
  next();
}

function validarRecordatorio(req, res, next) {
  const { enabled, time } = req.body ?? {};
  if (typeof enabled !== 'boolean') return fail(next, '"enabled" es obligatorio (true o false).');
  if (typeof time !== 'string') return fail(next, '"time" es obligatorio (HH:mm).');
  next();
}

function validarPeriodo(req, res, next) {
  const { periodo } = req.query;
  if (periodo !== 'semana' && periodo !== 'mes') return fail(next, 'Usa ?periodo=semana o ?periodo=mes.');
  next();
}

function validarNuevaEntrada(req, res, next) {
  const { text, shared } = req.body ?? {};
  if (typeof text !== 'string') return fail(next, '"text" es obligatorio.');
  if (shared !== undefined && typeof shared !== 'boolean') return fail(next, '"shared" debe ser true o false.');
  next();
}

function validarCambiosEntrada(req, res, next) {
  const { text, shared } = req.body ?? {};
  if (text === undefined && shared === undefined) return fail(next, 'Envía "text" y/o "shared".');
  if (text !== undefined && typeof text !== 'string') return fail(next, '"text" debe ser texto.');
  if (shared !== undefined && typeof shared !== 'boolean') return fail(next, '"shared" debe ser true o false.');
  next();
}

module.exports = {
  validarRegistroAnimo,
  validarRecordatorio,
  validarPeriodo,
  validarNuevaEntrada,
  validarCambiosEntrada,
};
