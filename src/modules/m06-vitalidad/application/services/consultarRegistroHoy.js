const { toDateKey } = require('../../domain/fechas');

// Registro de ánimo de hoy (o null). Lo usa la Casa para decidir si muestra
// la burbuja "¿Cómo te sientes hoy?" (RDF017 del M01).

function makeConsultarRegistroHoy({ moodRepository, clock, timeZone }) {
  return async function consultarRegistroHoy(userId) {
    return moodRepository.findLogByDate(userId, toDateKey(clock(), timeZone));
  };
}

module.exports = { makeConsultarRegistroHoy };
