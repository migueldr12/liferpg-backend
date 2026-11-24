const { notFound } = require('../../../../shared/errors/AppError');
const { utcToDateKey } = require('../../../../shared/utils/zonaHoraria');
const { habitActivityAt, missionActivity, parseActivityId, sessionActivity } = require('../../domain/entities/Activity');

const NOT_FOUND = 'No encontramos esa actividad.';

// Busca una actividad del diario por su id ("mision-…", "sesion-…" o "habito-…-AAAA-MM-DD").
// Devuelve { activity, origin, sources } (sources = fechas para el recorrido) o lanza 404:
// también cuando es de otro usuario o el periodo del hábito no forma parte del diario.
async function buscarActividad({ diaryRepository, now }, userId, activityId) {
  const ref = parseActivityId(activityId);
  if (!ref) throw notFound(NOT_FOUND);

  if (ref.origin === 'mision') {
    const mission = await diaryRepository.findMission(userId, ref.refId);
    if (!mission) throw notFound(NOT_FOUND);
    return { activity: missionActivity(mission), sources: { createdAt: mission.createdAt, startedAt: mission.sessionStartedAt } };
  }

  if (ref.origin === 'sesion') {
    const session = await diaryRepository.findSession(userId, ref.refId);
    if (!session) throw notFound(NOT_FOUND);
    return { activity: sessionActivity(session), sources: { startedAt: session.startedAt } };
  }

  const habit = await diaryRepository.findHabit(userId, ref.refId);
  if (!habit) throw notFound(NOT_FOUND);
  const checkIns = await diaryRepository.listCheckIns(userId, { from: ref.key, habitId: habit.id });
  const activity = habitActivityAt(habit, ref.key, checkIns, { todayKey: utcToDateKey(now()) });
  if (!activity) throw notFound(NOT_FOUND);
  return { activity, sources: {} };
}

module.exports = { buscarActividad };
