const { assertDiaryRepository } = require('../../src/modules/m09-diario-aventura/domain/repositories/diaryRepository');
const { dateKeyToUtc } = require('../../src/shared/utils/zonaHoraria');

// Repositorio del M09 en memoria para las pruebas: cumple el mismo contrato que el de Prisma.
// Los datos de M02 y M03 se siembran ya en el vocabulario del dominio, cada uno con su userId.
function createMemoryDiaryRepository({ missions = [], sessions = [], habits = [], checkIns = [] } = {}) {
  let seq = 0xf000;
  const id = () => (++seq).toString(16).padStart(24, '0');
  const notes = [];
  const mine = (userId) => (x) => x.userId === userId;
  const strip = ({ userId, ...rest }) => rest;
  const endedAt = (m) => m.completedAt ?? m.failedAt;

  return assertDiaryRepository({
    async listMissions(userId, { from } = {}) {
      return missions.filter(mine(userId)).filter((m) => !from || endedAt(m) >= from).map(strip);
    },
    async findMission(userId, missionId) {
      const m = missions.find((x) => x.id === missionId && x.userId === userId);
      return m ? strip(m) : null;
    },
    async listSessions(userId, { from } = {}) {
      return sessions.filter(mine(userId)).filter((s) => !from || s.startedAt >= from).map(strip);
    },
    async findSession(userId, sessionId) {
      const s = sessions.find((x) => x.id === sessionId && x.userId === userId);
      return s ? strip(s) : null;
    },
    async listHabits(userId) {
      return habits.filter(mine(userId)).map(strip);
    },
    async findHabit(userId, habitId) {
      const h = habits.find((x) => x.id === habitId && x.userId === userId);
      return h ? strip(h) : null;
    },
    async listCheckIns(userId, { from, habitId } = {}) {
      return checkIns
        .filter(mine(userId))
        .filter((c) => (!habitId || c.habitId === habitId) && (!from || dateKeyToUtc(c.dayKey) >= dateKeyToUtc(from)))
        .map(strip);
    },
    async listNotes(userId, activityId) {
      return notes.filter((n) => n.userId === userId && n.activityId === activityId).sort((a, b) => b.createdAt - a.createdAt).map((n) => ({ ...n }));
    },
    async findNote(userId, noteId) {
      const n = notes.find((x) => x.id === noteId && x.userId === userId);
      return n ? { ...n } : null;
    },
    async createNote({ userId, origin, activityId, text, at }) {
      const note = { id: id(), userId, origin, activityId, text, createdAt: at, updatedAt: at };
      notes.push(note);
      return { ...note };
    },
    async updateNote({ noteId, text, at }) {
      const note = notes.find((n) => n.id === noteId);
      Object.assign(note, { text, updatedAt: at });
      return { ...note };
    },
    async deleteNote(noteId) {
      notes.splice(notes.findIndex((n) => n.id === noteId), 1);
    },
  });
}

module.exports = { createMemoryDiaryRepository };
