const { validationError } = require('../../../../shared/errors/AppError');

const ALLOWED_EXPIRATION_HOURS = [24, 168, 720]; // 24h, 7 días (168h), 30 días (720h)

class GenerarCodigoDTO {
  constructor(body = {}) {
    // Acepta expirationHours (24, 168, 720) o expirationDays (1, 7, 30)
    let hours = Number(body.expirationHours);
    if (!hours && body.expirationDays) {
      hours = Number(body.expirationDays) * 24;
    }
    if (!hours) hours = 168; // 7 días por defecto

    const maxUses = body.maxUses !== undefined ? Number(body.maxUses) : 3;

    const errors = {};
    if (!ALLOWED_EXPIRATION_HOURS.includes(hours)) {
      errors.expirationHours = 'La vigencia debe ser de 24 h, 7 días o 30 días.';
    }
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 30) {
      errors.maxUses = 'Los usos máximos deben ser un entero entre 1 y 30.';
    }

    if (Object.keys(errors).length > 0) {
      throw validationError(errors);
    }

    this.expirationHours = hours;
    this.maxUses = maxUses;
  }
}

module.exports = { GenerarCodigoDTO };