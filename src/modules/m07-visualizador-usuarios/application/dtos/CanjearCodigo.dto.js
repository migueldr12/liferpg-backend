const { validationError } = require('../../../../shared/errors/AppError');

class CanjearCodigoDTO {
  constructor(body = {}) {
    const raw = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';

    if (!raw) {
      throw validationError({ code: 'Ingresa un código de amistad para canjear.' });
    }

    if (!/^[A-Z0-9]{3,5}-[A-Z0-9]{4,6}$/.test(raw)) {
      throw validationError({ code: 'El formato del código no es válido (ej. DRG-7K4Q).' });
    }

    this.code = raw;
  }
}

module.exports = { CanjearCodigoDTO };