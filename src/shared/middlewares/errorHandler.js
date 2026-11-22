const { AppError } = require('../errors/AppError');

// Errores de Prisma que tienen una respuesta clara para el cliente.
// https://www.prisma.io/docs/orm/reference/error-reference
const PRISMA_ERRORS = {
  P2002: () => new AppError(409, 'CONFLICT', 'Ya existe un registro con esos datos.'),
  P2023: () => new AppError(400, 'BAD_REQUEST', 'El identificador no es válido.'),
  P2025: () => new AppError(404, 'NOT_FOUND', 'No se encontró el recurso.'),
};

function toAppError(err) {
  if (err instanceof AppError) return err;
  if (err.type === 'entity.parse.failed') return new AppError(400, 'BAD_REQUEST', 'El cuerpo de la petición no es JSON válido.');
  if (err.type === 'entity.too.large') return new AppError(413, 'PAYLOAD_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
  if (err.code && PRISMA_ERRORS[err.code]) return PRISMA_ERRORS[err.code]();
  return null;
}

// Último middleware: responde todos los errores con el mismo formato y nunca
// expone el detalle interno de un error inesperado. Express lo reconoce como
// manejador de errores por recibir 4 parámetros, aunque `next` no se use.
function errorHandler(err, req, res, next) {
  const known = toAppError(err);
  if (!known) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' } });
  }
  const body = { code: known.code, message: known.message };
  if (known.details !== undefined) body.details = known.details;
  return res.status(known.status).json({ error: body });
}

module.exports = { errorHandler };
