// Racha = días consecutivos con al menos un check-in vigente.
// - Un día sin check-in rompe la racha solo si había hábitos debidos.
// - Un día sin hábitos debidos es neutro: ni suma ni rompe.
// - "Hoy" (último día de la lista) sin check-in todavía no rompe la racha: queda en riesgo.

// `days` va en orden ascendente y termina en hoy. Cada día: { checkIns, habitsDue }.
function calculateStreaks(days) {
  let run = 0;
  let best = 0;
  days.forEach((day, i) => {
    const isToday = i === days.length - 1;
    if (day.checkIns > 0) {
      run += 1;
      best = Math.max(best, run);
    } else if (day.habitsDue > 0 && !isToday) {
      run = 0;
    }
  });
  return { current: run, best };
}

const MESSAGES = {
  ACTIVA: 'Tu racha está activa: ya hiciste check-in hoy.',
  EN_RIESGO: 'Tu racha está en riesgo: hoy aún no haces check-in.',
  ROTA: 'Tu racha se rompió. ¡Empieza otra hoy!',
  SIN_RACHA: 'Todavía no tienes una racha. Haz tu primer check-in.',
};

function consistencyState({ current, best, todayCheckIns }) {
  let state;
  if (todayCheckIns > 0 && current > 0) state = 'ACTIVA';
  else if (current > 0) state = 'EN_RIESGO';
  else if (best > 0) state = 'ROTA';
  else state = 'SIN_RACHA';
  return { state, message: MESSAGES[state] };
}

module.exports = { calculateStreaks, consistencyState };
