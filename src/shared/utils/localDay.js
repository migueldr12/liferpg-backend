// Utilidades de "día local" sobre instantes UTC.
// El cliente manda su desfase en minutos con el mismo signo que Date.getTimezoneOffset()
// (México centro = 360, es decir UTC-6). La medianoche local del 22-nov es 22-nov 06:00Z,
// que es justo el periodStart que guardan los check-ins.
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

// 'YYYY-MM-DD' -> ms de esa fecha a las 00:00 UTC, o null si no es una fecha real.
function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof key === 'string' ? key : '');
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - 1, day);
  const check = new Date(ms);
  const real = check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
  return real ? ms : null;
}

// Instante UTC en que empieza el día local `key`.
function dayStartOfKey(key, utcOffset) {
  const ms = parseDateKey(key);
  return ms === null ? null : new Date(ms + utcOffset * MINUTE_MS);
}

// Fecha local 'YYYY-MM-DD' a la que pertenece un instante.
function dateKeyOf(instant, utcOffset) {
  return new Date(instant.getTime() - utcOffset * MINUTE_MS).toISOString().slice(0, 10);
}

const startOfLocalDay = (instant, utcOffset) => dayStartOfKey(dateKeyOf(instant, utcOffset), utcOffset);
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
// 0 = domingo … 6 = sábado, del día local que empieza en dayStart.
const localWeekday = (dayStart, utcOffset) => new Date(dayStart.getTime() - utcOffset * MINUTE_MS).getUTCDay();

module.exports = { DAY_MS, parseDateKey, dayStartOfKey, dateKeyOf, startOfLocalDay, addDays, localWeekday };
