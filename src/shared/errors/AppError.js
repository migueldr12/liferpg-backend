// Error de la aplicación con su código HTTP. Los servicios y validadores lanzan
// estos errores; el middleware errorHandler los convierte en la respuesta JSON del
// contrato de la app (docs/API.md del móvil): { "error": "mensaje en español", ... }
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
// El mensaje es el del primer campo con error, para que la app lo muestre tal cual
const validationError = (details) =>
  new AppError(400, 'VALIDATION_ERROR', Object.values(details ?? {})[0] ?? 'Los datos enviados no son válidos.', details);
const unauthorized = (message = 'Inicia sesión para continuar.') => new AppError(401, 'UNAUTHORIZED', message);
const forbidden = (message = 'No tienes permiso para esta acción.') => new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'No se encontró el recurso.') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message, details) => new AppError(409, 'CONFLICT', message, details);

module.exports = { AppError, badRequest, validationError, unauthorized, forbidden, notFound, conflict };
