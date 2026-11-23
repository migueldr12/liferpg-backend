// Reglas puras de M10 (sin Express ni base de datos).

const REASONS = Object.freeze({
  NO_ACTIVITY: 'NO_ACTIVITY',
  LOW_COMPLETION: 'LOW_COMPLETION',
});

// DailyClosure.completionRate se espera entre 0 y 1; si llega como porcentaje (0–100) se normaliza.
const normalizeRate = (rate) => (rate > 1 ? rate / 100 : rate);

// RDF104: "sin registros o con baja tasa de cumplimiento durante N días".
//  - activityCount: check-ins + misiones + enfoques completados dentro de la ventana
//  - completionRates: tasas de los cierres diarios dentro de la ventana
function evaluateInactivity({ activityCount, completionRates = [], lowRate }) {
  if (activityCount === 0) return { inactive: true, reason: REASONS.NO_ACTIVITY };
  if (completionRates.length > 0) {
    const rates = completionRates.map(normalizeRate);
    const average = rates.reduce((sum, r) => sum + r, 0) / rates.length;
    if (average < lowRate) return { inactive: true, reason: REASONS.LOW_COMPLETION, average };
  }
  return { inactive: false };
}

const days = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;

function ownAlertMessage(reason, thresholdDays) {
  if (reason === REASONS.LOW_COMPLETION) {
    return `En los últimos ${days(thresholdDays)} cumpliste muy pocos hábitos. ¡Retoma con una meta pequeña hoy!`;
  }
  return `Llevas ${days(thresholdDays)} sin registrar actividad. Tu mascota te extraña.`;
}

const friendAlertTitle = (name) => `${name} necesita ánimo`;
const friendAlertBody = (name) => `${name} lleva unos días sin actividad. Mándale un sticker para animarle.`;

module.exports = { REASONS, evaluateInactivity, ownAlertMessage, friendAlertTitle, friendAlertBody, normalizeRate };
