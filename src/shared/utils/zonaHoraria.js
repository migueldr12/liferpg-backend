// Fechas en la zona horaria del juego (TIME_ZONE, por defecto la de México).
// En la API un día viaja como "AAAA-MM-DD"; en la base, como instante UTC (docs/database.md).
// Lo usan los módulos que agrupan por día o semana (M12; el M06 tiene su propia copia).

const ZONA_POR_DEFECTO = 'America/Mexico_City';
const DIA_MS = 24 * 60 * 60 * 1000;

const formatos = new Map();
const partes = (date, timeZone) => {
  if (!formatos.has(timeZone)) {
    formatos.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return Object.fromEntries(formatos.get(timeZone).formatToParts(date).map((p) => [p.type, Number(p.value)]));
};

const pad = (n) => String(n).padStart(2, '0');

// Instante → "2026-11-22" en la zona del juego
function toDateKey(date, timeZone = ZONA_POR_DEFECTO) {
  const p = partes(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// "2026-11-22" ↔ medianoche UTC (así se guardan dayStart y las fechas límite)
const dateKeyToUtc = (key) => new Date(`${key}T00:00:00.000Z`);
const utcToDateKey = (date) => date.toISOString().slice(0, 10);

const addDays = (key, days) => utcToDateKey(new Date(dateKeyToUtc(key).getTime() + days * DIA_MS));

// Minutos que la zona va adelante (+) o atrás (−) de UTC en ese instante
function offsetMinutes(date, timeZone) {
  const p = partes(date, timeZone);
  return (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

// Instante en que empieza el día "key" en la zona del juego (00:00 local)
function inicioDelDia(key, timeZone = ZONA_POR_DEFECTO) {
  const utc = dateKeyToUtc(key).getTime();
  let guess = utc - offsetMinutes(new Date(utc), timeZone) * 60000;
  guess = utc - offsetMinutes(new Date(guess), timeZone) * 60000; // por si hay cambio de horario
  return new Date(guess);
}

// Lunes de la semana del día "key"
const lunesDe = (key) => addDays(key, -((dateKeyToUtc(key).getUTCDay() + 6) % 7));

module.exports = { ZONA_POR_DEFECTO, toDateKey, dateKeyToUtc, utcToDateKey, addDays, inicioDelDia, lunesDe };
