const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { dateKeyToUtc } = require('../../../../shared/utils/zonaHoraria');
const { assertDiaryRepository } = require('../../domain/repositories/diaryRepository');
const { toCheckIn, toHabit, toMission, toNote, toSession } = require('../mappers/diaryMapper');

// Repositorio del M09 sobre MongoDB (Prisma). Lee hábitos y check-ins (M02) y misiones y
// sesiones (M03) sin modificarlos; solo escribe en activity_notes.

const LAST_SESSION = { focusSessions: { orderBy: { startedAt: 'desc' }, take: 1 } };
const HABIT_NAME = { habit: { select: { name: true, area: true } } };
// En MongoDB un campo opcional puede no existir, y "campo: null" no encuentra esos documentos.
// Por eso "sin misión" y "sin revertir" se filtran aquí, no en la consulta.
const standalone = (s) => !s.missionId;
const notReverted = (c) => !c.revertedAt;

function createPrismaDiaryRepository({ db = getPrisma } = {}) {
  const prisma = () => (typeof db === 'function' ? db() : db);

  return assertDiaryRepository({
    async listMissions(userId, { from } = {}) {
      const window = from ? { OR: [{ completedAt: { gte: from } }, { failedAt: { gte: from } }] } : {};
      const docs = await prisma().mission.findMany({
        where: { userId, status: { in: ['COMPLETED', 'FAILED'] }, ...window },
        include: LAST_SESSION,
      });
      return docs.map(toMission);
    },

    async findMission(userId, missionId) {
      const doc = await prisma().mission.findFirst({
        where: { id: missionId, userId, status: { in: ['COMPLETED', 'FAILED'] } },
        include: LAST_SESSION,
      });
      return toMission(doc);
    },

    async listSessions(userId, { from } = {}) {
      const docs = await prisma().focusSession.findMany({
        where: { userId, status: { in: ['COMPLETED', 'ABANDONED'] }, ...(from && { startedAt: { gte: from } }) },
        include: HABIT_NAME,
      });
      return docs.filter(standalone).map(toSession);
    },

    async findSession(userId, sessionId) {
      const doc = await prisma().focusSession.findFirst({
        where: { id: sessionId, userId, status: { in: ['COMPLETED', 'ABANDONED'] } },
        include: HABIT_NAME,
      });
      return doc && standalone(doc) ? toSession(doc) : null;
    },

    async listHabits(userId) {
      return (await prisma().habit.findMany({ where: { userId } })).map(toHabit);
    },

    async findHabit(userId, habitId) {
      return toHabit(await prisma().habit.findFirst({ where: { id: habitId, userId } }));
    },

    async listCheckIns(userId, { from, habitId } = {}) {
      const docs = await prisma().habitCheckIn.findMany({
        where: { userId, ...(habitId && { habitId }), ...(from && { periodStart: { gte: dateKeyToUtc(from) } }) },
      });
      return docs.filter(notReverted).map(toCheckIn);
    },

    async listNotes(userId, activityId) {
      const docs = await prisma().activityNote.findMany({ where: { userId, activityId }, orderBy: { createdAt: 'desc' } });
      return docs.map(toNote);
    },

    async findNote(userId, noteId) {
      return toNote(await prisma().activityNote.findFirst({ where: { id: noteId, userId } }));
    },

    async createNote({ userId, origin, activityId, text, at }) {
      const doc = await prisma().activityNote.create({
        data: { userId, activityType: origin, activityId, text, createdAt: at, updatedAt: at },
      });
      return toNote(doc);
    },

    async updateNote({ noteId, text, at }) {
      return toNote(await prisma().activityNote.update({ where: { id: noteId }, data: { text, updatedAt: at } }));
    },

    async deleteNote(noteId) {
      await prisma().activityNote.delete({ where: { id: noteId } });
    },
  });
}

module.exports = { createPrismaDiaryRepository };
