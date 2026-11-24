const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { createPrismaDiaryRepository } = require('../../src/modules/m09-diario-aventura/infrastructure/repositories/prismaDiaryRepository');
const { crearPrismaFalso, nuevoId } = require('../support/prismaFalso');

// Repositorio REAL del M09 contra el cliente de Prisma falso. En MongoDB un campo opcional
// puede no existir en el documento, y "campo: null" no lo encuentra: estas pruebas cuidan que
// el diario incluya check-ins sin "revertedAt" y sesiones sin "missionId".
const USER = nuevoId();

describe('M09 · repositorio de Prisma', () => {
  test('incluye los check-ins que no traen revertedAt y excluye los revertidos', async () => {
    const db = crearPrismaFalso();
    const habitId = nuevoId();
    await db.habitCheckIn.create({ data: { userId: USER, habitId, periodStart: new Date('2026-11-21T00:00:00Z'), periodEnd: new Date('2026-11-22T00:00:00Z'), completedAt: new Date('2026-11-21T15:00:00Z'), xpAwarded: 20, pointsAwarded: 20 } });
    await db.habitCheckIn.create({ data: { userId: USER, habitId, periodStart: new Date('2026-11-22T00:00:00Z'), periodEnd: new Date('2026-11-23T00:00:00Z'), completedAt: new Date('2026-11-22T15:00:00Z'), revertedAt: new Date('2026-11-22T16:00:00Z') } });
    const repo = createPrismaDiaryRepository({ db });
    const rows = await repo.listCheckIns(USER, {});
    assert.deepEqual(rows.map((c) => [c.dayKey, c.points]), [['2026-11-21', 20]]);
    assert.equal((await repo.listCheckIns(USER, { from: '2026-11-22' })).length, 0);
  });

  test('las sesiones sueltas no traen missionId; las de una misión no salen aparte', async () => {
    const db = crearPrismaFalso();
    const loose = await db.focusSession.create({ data: { userId: USER, plannedMinutes: 15, status: 'COMPLETED', startedAt: new Date('2026-11-22T16:00:00Z'), endedAt: new Date('2026-11-22T16:15:00Z') } });
    const ofMission = await db.focusSession.create({ data: { userId: USER, missionId: nuevoId(), plannedMinutes: 25, status: 'COMPLETED', startedAt: new Date('2026-11-22T17:00:00Z') } });
    await db.focusSession.create({ data: { userId: USER, plannedMinutes: 25, status: 'RUNNING', startedAt: new Date('2026-11-23T17:00:00Z') } });
    const repo = createPrismaDiaryRepository({ db });
    assert.deepEqual((await repo.listSessions(USER, {})).map((s) => s.id), [loose.id]);
    assert.equal((await repo.findSession(USER, loose.id)).title, undefined);
    assert.equal((await repo.findSession(USER, loose.id)).id, loose.id);
    assert.equal(await repo.findSession(USER, ofMission.id), null);
  });

  test('las notas se guardan con el id de la actividad y se leen de la más reciente a la más antigua', async () => {
    const db = crearPrismaFalso();
    const repo = createPrismaDiaryRepository({ db });
    const activityId = `mision-${nuevoId()}`;
    const first = await repo.createNote({ userId: USER, origin: 'mision', activityId, text: 'Primera', at: new Date('2026-11-24T10:00:00Z') });
    await repo.createNote({ userId: USER, origin: 'mision', activityId, text: 'Segunda', at: new Date('2026-11-24T11:00:00Z') });
    assert.deepEqual((await repo.listNotes(USER, activityId)).map((n) => n.text), ['Segunda', 'Primera']);
    const edited = await repo.updateNote({ noteId: first.id, text: 'Primera editada', at: new Date('2026-11-24T12:00:00Z') });
    assert.equal(edited.text, 'Primera editada');
    await repo.deleteNote(first.id);
    assert.equal(await repo.findNote(USER, first.id), null);
  });
});
