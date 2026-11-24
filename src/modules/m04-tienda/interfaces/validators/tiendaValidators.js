const { badRequest } = require('../../../../shared/errors/AppError');

// Validaciones de forma. Las reglas de negocio (puntos, precios, pertenencia)
// las revisan los servicios.

function validarCompra(req, res, next) {
  if (typeof req.body?.itemId !== 'string' || !req.body.itemId.trim()) {
    return next(badRequest('Elige el artículo que quieres comprar.'));
  }
  return next();
}

function validarRecompensa(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(badRequest('Envía los datos de la recompensa.'));
  }
  return next();
}

module.exports = { validarCompra, validarRecompensa };
