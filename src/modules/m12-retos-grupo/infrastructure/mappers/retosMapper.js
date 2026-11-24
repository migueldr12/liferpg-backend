// Conversión de los enums del esquema (inglés) ↔ valores de la API del M12 (PWA).

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));

const AREA_TO_DB = { cultura: 'CULTURE', fisico: 'PHYSICAL', enfoque: 'FOCUS' };
const METRIC_TO_DB = { habitos: 'CHECKINS', misiones: 'MISSIONS', minutos: 'FOCUS_MINUTES', xp: 'XP' };
const STATUS_TO_DB = { activo: 'ACTIVE', completado: 'COMPLETED' };
const FREQUENCY_FROM_DB = { DAILY: 'diario', WEEKLY: 'semanal' };

module.exports = {
  AREA_TO_DB,
  AREA_FROM_DB: invert(AREA_TO_DB),
  METRIC_TO_DB,
  METRIC_FROM_DB: invert(METRIC_TO_DB),
  STATUS_TO_DB,
  STATUS_FROM_DB: invert(STATUS_TO_DB),
  FREQUENCY_FROM_DB,
};
