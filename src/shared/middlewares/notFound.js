const { notFound } = require('../errors/AppError');

// Cualquier ruta que ningún módulo atendió termina aquí.
function notFoundHandler(req, res, next) {
  next(notFound(`No existe la ruta ${req.method} ${req.originalUrl}.`));
}

module.exports = { notFoundHandler };
