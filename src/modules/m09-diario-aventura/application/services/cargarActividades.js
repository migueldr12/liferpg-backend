const { addDays, lunesDe, utcToDateKey } = require('../../../../shared/utils/zonaHoraria');
const { MISSED_LOOKBACK_DAYS, buildActivities, filterAndSort } = require('../../domain/entities/Activity');

// Lee lo de M02 y M03 y arma las actividades del diario de un usuario (lo usan el listado y
// las gráficas). "since" es un instante; sin él se leen todas las misiones, sesiones y
// check-ins, y los hábitos sin check-in solo se marcan en los últimos 30 días.
async function cargarActividades({ diaryRepository, now }, userId, { since = null, ...filters } = {}) {
  const todayKey = utcToDateKey(now()); // los hábitos siguen los días de M02 (UTC)
  const sinceKey = since ? utcToDateKey(since) : null;
  const missedFromKey = sinceKey ?? addDays(todayKey, -(MISSED_LOOKBACK_DAYS - 1));
  // Los check-ins se leen desde el lunes de esa semana: un hábito semanal pudo cumplirse antes
  const checkInsFrom = sinceKey ? lunesDe(sinceKey) : null;

  const [missions, sessions, habits, checkIns] = await Promise.all([
    diaryRepository.listMissions(userId, { from: since }),
    diaryRepository.listSessions(userId, { from: since }),
    diaryRepository.listHabits(userId),
    diaryRepository.listCheckIns(userId, { from: checkInsFrom }),
  ]);

  const activities = buildActivities({ missions, sessions, habits, checkIns, todayKey, missedFromKey });
  return filterAndSort(activities, { ...filters, since });
}

module.exports = { cargarActividades };
