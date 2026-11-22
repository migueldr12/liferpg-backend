const { AppError } = require('../../../shared/errors/AppError');

// Errores del M06. Son AppError de la base del servidor (src/shared/errors/AppError.js),
// así errorHandler los responde con el formato del contrato: { error, code }.
// Se usan como clases para que las entidades y servicios hagan `throw new ValidationError(...)`.

class ValidationError extends AppError {
  constructor(message) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'No se encontró el recurso.') {
    super(404, 'NOT_FOUND', message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Inicia sesión para continuar.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

module.exports = { ValidationError, NotFoundError, UnauthorizedError };
