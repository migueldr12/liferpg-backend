const { conflict } = require('../../src/shared/errors/AppError');
const { assertMissionRepository } = require('../../src/modules/m03-misiones-enfoque/domain/repositories/missionRepository');

const POINTS = { cultura: 'culturePoints', fisico: 'physicalPoints', enfoque: 'focusPoints' };

// Repositorio del M03 en memoria para las pruebas: cumple el mismo contrato que el de Prisma.
function createMemoryMissionRepository({ profiles = {} } = {}) {
  let seq = 0;
  const id = () => (++seq).toString(16).padStart(24, '0');
  const missions = [];
  const sessions = [];
  const profileStore = Object.fromEntries(
    Object.entries(profiles).map(([userId, p]) => [userId, { xp: 0, culturePoints: 0, physicalPoints: 0, focusPoints: 0, ...p }]),
  );

  const lastSession = (missionId) => sessions.filter((s) => s.missionId === missionId).at(-1);
  const view = (m) => {
    const last = lastSession(m.id);
    return { ...m, failReason: last?.status === 'abandonada' ? last.abandonReason : null };
  };

  return assertMissionRepository({
    async listActive(userId, { type } = {}) {
      return missions.filter((m) => m.userId === userId && m.status === 'activa' && (!type || m.type === type)).reverse().map(view);
    },
    async findMission(userId, missionId) {
      const m = missions.find((x) => x.id === missionId && x.userId === userId);
      return m ? view(m) : null;
    },
    async createMission({ userId, title, type, durationMin }) {
      const m = {
        id: id(), userId, title, type, durationMin, status: 'activa', reward: { xp: 0, points: 0 },
        validation: null, activity: null, createdAt: new Date(), completedAt: null, failedAt: null,
      };
      missions.push(m);
      return view(m);
    },
    async listHistory(userId, { status, type, from, to, limit = 50 } = {}) {
      return missions
        .filter((m) => m.userId === userId && (status ? m.status === status : m.status !== 'activa'))
        .filter((m) => !type || m.type === type)
        .filter((m) => {
          const at = m.completedAt ?? m.failedAt;
          return (!from || at >= from) && (!to || at <= to);
        })
        .reverse()
        .slice(0, limit)
        .map(view);
    },
    async findRunningSession(userId) {
      return sessions.find((s) => s.userId === userId && s.status === 'en_curso') ?? null;
    },
    async findSession(userId, sessionId) {
      return sessions.find((s) => s.id === sessionId && s.userId === userId) ?? null;
    },
    async hasCompletedSession(missionId) {
      return sessions.some((s) => s.missionId === missionId && s.status === 'completada');
    },
    async startSession({ userId, missionId, plannedMinutes, at }) {
      const s = { id: id(), userId, missionId, plannedMinutes, status: 'en_curso', startedAt: at, endedAt: null, abandonReason: null };
      sessions.push(s);
      return { ...s };
    },
    async abandonSession({ sessionId, missionId, reason, at }) {
      const s = sessions.find((x) => x.id === sessionId);
      if (s.status !== 'en_curso') throw conflict('La sesión ya terminó.');
      Object.assign(s, { status: 'abandonada', endedAt: at, abandonReason: reason });
      const m = missions.find((x) => x.id === missionId);
      Object.assign(m, { status: 'fallida', failedAt: at });
      return { mission: view(m), session: { ...s } };
    },
    async completeSession({ sessionId, at }) {
      const s = sessions.find((x) => x.id === sessionId);
      if (s.status !== 'en_curso') throw conflict('La sesión ya terminó.');
      Object.assign(s, { status: 'completada', endedAt: at });
      return { ...s };
    },
    async completeMission({ userId, missionId, validation, activity, reward, at }) {
      const profile = profileStore[userId];
      if (!profile) throw conflict('El jugador todavía no tiene perfil (M01).');
      const m = missions.find((x) => x.id === missionId && x.userId === userId);
      if (m.status !== 'activa') throw conflict('La misión ya no está activa.');
      Object.assign(m, { status: 'completada', completedAt: at, reward, validation, activity: activity ?? null });
      profile.xp += reward.xp;
      profile[POINTS[m.type]] += reward.points;
      return { mission: view(m), profile: { ...profile } };
    },
  });
}

module.exports = { createMemoryMissionRepository };
