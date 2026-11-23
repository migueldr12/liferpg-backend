const { ValidationError } = require('../../domain/errors');

// RDF070 · programarRecordatorioAnimo.
// Guarda si el recordatorio diario está activo y a qué hora (HH:mm).
// La notificación local la programa la app móvil con este dato.

const DEFAULT_REMINDER = { enabled: true, time: '20:00' };
const HORA_VALIDA = /^([01]\d|2[0-3]):[0-5]\d$/;

function makeConsultarRecordatorio({ moodRepository }) {
  return async function consultarRecordatorio(userId) {
    return (await moodRepository.getReminder(userId)) ?? { ...DEFAULT_REMINDER };
  };
}

function makeProgramarRecordatorioAnimo({ moodRepository }) {
  return async function programarRecordatorioAnimo(userId, { enabled, time }) {
    if (typeof enabled !== 'boolean') throw new ValidationError('"enabled" debe ser true o false.');
    if (!HORA_VALIDA.test(time ?? '')) throw new ValidationError('La hora debe tener formato HH:mm (p. ej. 20:00).');
    const reminder = { enabled, time };
    await moodRepository.saveReminder(userId, reminder);
    return reminder;
  };
}

module.exports = { makeConsultarRecordatorio, makeProgramarRecordatorioAnimo, DEFAULT_REMINDER };
