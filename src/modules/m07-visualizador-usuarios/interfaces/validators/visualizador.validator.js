const { badRequest } = require('../../../../shared/errors/AppError');

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !OBJECT_ID_REGEX.test(value)) {
      return next(badRequest(`El parámetro ${paramName} no es un identificador válido.`));
    }
    return next();
  };
}

function validatePartyQuery(req, res, next) {
  const { sort } = req.query;
  const allowedSorts = ['nivel', 'racha', 'actividad'];
  if (sort && !allowedSorts.includes(String(sort).toLowerCase())) {
    return next(badRequest('El parámetro sort debe ser nivel, racha o actividad.'));
  }
  return next();
}

module.exports = { validateObjectIdParam, validatePartyQuery };