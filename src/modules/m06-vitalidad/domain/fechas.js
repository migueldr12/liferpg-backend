// Utilidades de fechas del M06.
//
// - En la API un "día" viaja como texto AAAA-MM-DD.
// - En la base (docs/database.md) se guarda como dayStart: la medianoche UTC de ese día.
// - El día se calcula en la zona horaria del juego (TIME_ZONE, por defecto la de México),
//   no en la del servidor: así un registro de las 21:00 en León no cae "mañana" si el
//   servidor está en UTC.

const ZONA_POR_DEFECTO = 'America/Mexico_City';
const DIA_MS = 24 * 60 * 60 * 1000;

const formatos = new Map();
const formato = (timeZone) => {
  if (!formatos.has(timeZone)) {
    formatos.set(timeZone, new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }));
  }
  return formatos.get(timeZone);
};

// Date → "2026-11-13" (día en la zona horaria del juego)
function toDateKey(date, timeZone = ZONA_POR_DEFECTO) {
  const parts = Object.fromEntries(formato(timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// "2026-11-13" ↔ medianoche UTC (campo dayStart de la base)
const dateKeyToDayStart = (key) => new Date(`${key}T00:00:00.000Z`);
const dayStartToDateKey = (date) => date.toISOString().slice(0, 10);

// "2026-11-13" + n días → "2026-11-14" (n puede ser negativo)
const addDays = (key, days) => dayStartToDateKey(new Date(dateKeyToDayStart(key).getTime() + days * DIA_MS));

// Momento de hace N días (lo usan los datos de ejemplo)
const daysBefore = (today, days) => new Date(today.getTime() - days * DIA_MS);

module.exports = { ZONA_POR_DEFECTO, toDateKey, dateKeyToDayStart, dayStartToDateKey, addDays, daysBefore };
