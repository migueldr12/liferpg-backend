const { AppError } = require('../../../shared/errors/AppError');

// Errores del M00. Son AppError de la base del servidor: errorHandler los responde
// con el formato del contrato { error, code }.

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

class ConflictError extends AppError {
  constructor(message) {
    super(409, 'CONFLICT', message);
  }
}

module.exports = { ValidationError, NotFoundError, ConflictError };
