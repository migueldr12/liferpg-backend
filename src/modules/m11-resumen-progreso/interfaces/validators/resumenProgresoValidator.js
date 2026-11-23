const { validationError } = require('../../../../shared/errors/AppError');
const { parseDateKey } = require('../../../../shared/utils/localDay');

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const isText = (v) => typeof v === 'string' && v.trim() !== '';

// Validan el query string y devuelven los valores ya tipados.
// Las reglas que dependen de "hoy" (fechas futuras, tamaño del rango) las aplica el servicio.
function readCommon(query, errors, out) {
  if (query.utcOffset !== undefined) {
    const n = Number(query.utcOffset);
    if (!isText(query.utcOffset) || !Number.isInteger(n) || n < -840 || n > 840) {
      errors.utcOffset = 'utcOffset debe ser un entero de minutos entre -840 y 840 (p. ej. 360 para UTC-6).';
    } else out.utcOffset = n;
  }
  if (query.usuarioId !== undefined) {
    if (!isText(query.usuarioId) || !OBJECT_ID.test(query.usuarioId)) errors.usuarioId = 'El identificador del usuario no es válido.';
    else out.usuarioId = query.usuarioId.toLowerCase();
  }
}

function readDate(query, field, label, errors, out) {
  if (query[field] === undefined) return;
  if (!isText(query[field]) || parseDateKey(query[field]) === null) errors[field] = `${label} debe tener el formato AAAA-MM-DD.`;
  else out[field] = query[field];
}

function build(read) {
  return (query = {}) => {
    const errors = {};
    const out = {};
    readCommon(query, errors, out);
    read(query, errors, out);
    if (Object.keys(errors).length) throw validationError(errors);
    return out;
  };
}

const readRange = (query, errors, out) => {
  readDate(query, 'desde', 'La fecha inicial', errors, out);
  readDate(query, 'hasta', 'La fecha final', errors, out);
};

const validators = {
  soloUsuario: build(() => {}),
  fecha: build((query, errors, out) => readDate(query, 'fecha', 'La fecha', errors, out)),
  rango: build(readRange),
  rangoConUmbral: build((query, errors, out) => {
    readRange(query, errors, out);
    if (query.umbral !== undefined) {
      const n = Number(query.umbral);
      if (!isText(query.umbral) || !Number.isFinite(n) || n < 0 || n > 100) errors.umbral = 'El umbral debe ser un porcentaje entre 0 y 100.';
      else out.umbral = n;
    }
  }),
};

module.exports = { validators };
