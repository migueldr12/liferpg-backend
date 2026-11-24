// RF018 · Tú vs. tú (RDF065 a RDF067). Cálculo puro: recibe la actividad ya leída de la base
// y arma la respuesta MonthlyComparison del móvil (src/models/Achievement.ts).
const { toDateKey, addDays, inicioDelDia } = require('../../../shared/utils/zonaHoraria');

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');
const diasDelMes = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate(); // month 1-12
const redondear = (n, decimals) => Number(n.toFixed(decimals));

/**
 * Tramos a comparar: días 1 a hoy de este mes y los mismos días del mes anterior
 * (recortado si el mes anterior es más corto, p. ej. 31 de marzo → 1 al 28 de febrero).
 * `desde`/`hasta` son instantes (hasta es exclusivo); `primerDia`/`ultimoDia` claves "AAAA-MM-DD".
 */
function tramos(now, timeZone) {
  const hoy = toDateKey(now, timeZone);
  const [year, month, toDay] = hoy.split('-').map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevToDay = Math.min(toDay, diasDelMes(prevYear, prevMonth));

  const tramo = (y, m, dias) => {
    const primerDia = `${y}-${pad(m)}-01`;
    const ultimoDia = `${y}-${pad(m)}-${pad(dias)}`;
    return { primerDia, ultimoDia, dias, desde: inicioDelDia(primerDia, timeZone), hasta: inicioDelDia(addDays(ultimoDia, 1), timeZone) };
  };

  return {
    toDay,
    currentMonth: MESES[month - 1],
    previousMonth: MESES[prevMonth - 1],
    actual: tramo(year, month, toDay),
    anterior: tramo(prevYear, prevMonth, prevToDay),
  };
}

// Racha máxima: días locales consecutivos con al menos un check-in dentro del tramo
function rachaMaxima(dias, tramo) {
  let mejor = 0;
  let actual = 0;
  for (let key = tramo.primerDia; key <= tramo.ultimoDia; key = addDays(key, 1)) {
    actual = dias.has(key) ? actual + 1 : 0;
    mejor = Math.max(mejor, actual);
  }
  return mejor;
}

/**
 * Resumen de un tramo. `actividad`: { checkIns, missions, focusSessions, moods } ya filtrados
 * por usuario y fechas (check-ins sin revertir, misiones y sesiones completadas).
 * Devuelve las métricas y la XP acumulada día por día (arreglo de largo `largo`).
 */
function resumir(actividad, tramo, timeZone, largo) {
  const xpPorDia = new Map();
  const sumarXp = (instante, xp) => {
    if (!instante || !xp) return;
    const key = toDateKey(new Date(instante), timeZone);
    xpPorDia.set(key, (xpPorDia.get(key) ?? 0) + xp);
  };
  actividad.checkIns.forEach((c) => sumarXp(c.completedAt, c.xpAwarded));
  actividad.missions.forEach((m) => sumarXp(m.completedAt, m.xpAwarded));
  actividad.focusSessions.forEach((f) => sumarXp(f.endedAt, f.xpAwarded));

  const dailyXp = [];
  let total = 0;
  for (let i = 0; i < largo; i++) {
    // Si el mes anterior es más corto, los días que no existen repiten el último acumulado
    if (i < tramo.dias) total += xpPorDia.get(addDays(tramo.primerDia, i)) ?? 0;
    dailyXp.push(total);
  }

  const diasConCheckIn = new Set(actividad.checkIns.map((c) => toDateKey(new Date(c.completedAt), timeZone)));
  const minutosEnfoque = actividad.focusSessions.reduce((s, f) => s + (f.plannedMinutes ?? 0), 0);
  const animos = actividad.moods.map((m) => m.mood);

  return {
    dailyXp,
    valores: {
      xp: total,
      misiones: actividad.missions.length,
      enfoque: redondear(minutosEnfoque / 60, 1),
      racha: rachaMaxima(diasConCheckIn, tramo),
      habitos: actividad.checkIns.length,
      animo: animos.length ? redondear(animos.reduce((a, b) => a + b, 0) / animos.length, 1) : 0,
    },
  };
}

const METRICAS = [
  { key: 'xp', label: 'XP ganada', decimals: 0 },
  { key: 'misiones', label: 'Misiones completadas', decimals: 0 },
  { key: 'enfoque', label: 'Horas de enfoque', decimals: 1 },
  { key: 'racha', label: 'Racha máxima (días)', decimals: 0 },
  { key: 'habitos', label: 'Hábitos cumplidos', decimals: 0 },
  { key: 'animo', label: 'Ánimo promedio', decimals: 1 },
];

function armarComparativa({ periodos, actual, anterior, timeZone }) {
  const largo = periodos.toDay;
  const a = resumir(actual, periodos.actual, timeZone, largo);
  const b = resumir(anterior, periodos.anterior, timeZone, largo);
  return {
    fromDay: 1,
    toDay: periodos.toDay,
    currentMonth: periodos.currentMonth,
    previousMonth: periodos.previousMonth,
    metrics: METRICAS.map((m) => ({ ...m, current: a.valores[m.key], previous: b.valores[m.key] })),
    dailyXp: { current: a.dailyXp, previous: b.dailyXp },
  };
}

module.exports = { tramos, armarComparativa, rachaMaxima };
