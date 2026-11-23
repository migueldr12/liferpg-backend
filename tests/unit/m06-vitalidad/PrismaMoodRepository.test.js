// Pruebas del repositorio REAL del M06 (PrismaMoodRepository) contra un cliente de
// Prisma falso (tests/support/prismaFalso.js): comprueban cómo se guarda en las
// colecciones de MongoDB (mood_logs, journal_entries, player_profiles). Ejecutar: pnpm test

const test = require('node:test');
const assert = require('node:assert/strict');

const { PrismaMoodRepository } = require('../../../src/modules/m06-vitalidad/infrastructure/repositories/PrismaMoodRepository');
const { MoodLog } = require('../../../src/modules/m06-vitalidad/domain/entities/MoodLog');
const { JournalEntry } = require('../../../src/modules/m06-vitalidad/domain/entities/JournalEntry');
const { toDateKey, addDays } = require('../../../src/modules/m06-vitalidad/domain/fechas');
const { NotFoundError, UnauthorizedError } = require('../../../src/modules/m06-vitalidad/domain/errors');
const { crearPrismaFalso, nuevoId } = require('../../support/prismaFalso');

const nuevo = () => {
  const db = crearPrismaFalso();
  return { db, repo: new PrismaMoodRepository({ db }) };
};

const registro = (userId, date, mood = 4, energy = 6, id = null) =>
  new MoodLog({ id, userId, date, createdAt: `${date}T20:00:00.000Z`, mood, energy, factors: ['motivada'] });

test('fechas: el día se calcula en hora de México, no en UTC', () => {
  // 03:00 UTC del 14 = 21:00 del 13 en León
  assert.equal(toDateKey(new Date('2026-11-14T03:00:00Z')), '2026-11-13');
  assert.equal(toDateKey(new Date('2026-11-14T03:00:00Z'), 'UTC'), '2026-11-14');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('registro nuevo: dayStart en medianoche UTC, id de MongoDB y +5 XP al perfil en la misma operación', async () => {
  const { db, repo } = nuevo();
  const userId = nuevoId();
  await db.playerProfile.create({ data: { userId, xp: 10, moodReminderEnabled: true, moodReminderTime: '20:00' } });

  const saved = await repo.saveLog(registro(userId, '2026-11-13'), { xpAwarded: 5 });

  assert.match(saved.id, /^[a-f\d]{24}$/);
  assert.equal(saved.date, '2026-11-13');
  assert.deepEqual(db.moodLog.rows[0].dayStart, new Date('2026-11-13T00:00:00.000Z'));
  assert.equal(db.playerProfile.rows[0].xp, 15);
  assert.deepEqual(await repo.findLogByDate(userId, '2026-11-13'), saved);
});

test('actualizar el registro del día conserva el id y no suma XP', async () => {
  const { db, repo } = nuevo();
  const userId = nuevoId();
  const first = await repo.saveLog(registro(userId, '2026-11-13'), { xpAwarded: 0 });
  const second = await repo.saveLog(registro(userId, '2026-11-13', 2, 3, first.id));
  assert.equal(second.id, first.id);
  assert.equal(second.mood, 2);
  assert.equal(db.moodLog.rows.length, 1);
});

test('dos registros nuevos el mismo día chocan con el índice único (P2002)', async () => {
  const { repo } = nuevo();
  const userId = nuevoId();
  await repo.saveLog(registro(userId, '2026-11-13'));
  await assert.rejects(repo.saveLog(registro(userId, '2026-11-13')), { code: 'P2002' });
});

test('findLogsBetween incluye ambos extremos y solo del usuario', async () => {
  const { repo } = nuevo();
  const [a, b] = [nuevoId(), nuevoId()];
  for (const date of ['2026-11-01', '2026-11-05', '2026-11-07', '2026-11-08']) await repo.saveLog(registro(a, date));
  await repo.saveLog(registro(b, '2026-11-05'));
  const logs = await repo.findLogsBetween(a, '2026-11-01', '2026-11-07');
  assert.deepEqual(logs.map((l) => l.date), ['2026-11-01', '2026-11-05', '2026-11-07']);
});

test('recordatorio: vive en el perfil; sin perfil se avisa con 404', async () => {
  const { db, repo } = nuevo();
  const userId = nuevoId();
  assert.equal(await repo.getReminder(userId), null);
  await assert.rejects(repo.saveReminder(userId, { enabled: false, time: '21:30' }), NotFoundError);

  await db.playerProfile.create({ data: { userId, xp: 0, moodReminderEnabled: true, moodReminderTime: '20:00' } });
  assert.deepEqual(await repo.getReminder(userId), { enabled: true, time: '20:00' });
  await repo.saveReminder(userId, { enabled: false, time: '21:30' });
  assert.deepEqual(await repo.getReminder(userId), { enabled: false, time: '21:30' });
});

test('diario: la primera entrada del día se liga al registro; todas muestran el ánimo de su día', async () => {
  const { db, repo } = nuevo();
  const userId = nuevoId();
  const log = await repo.saveLog(registro(userId, '2026-11-13', 5, 9));
  const entrada = (text, createdAt) =>
    new JournalEntry({ id: null, userId, date: toDateKey(new Date(createdAt)), createdAt, text });

  const e1 = await repo.saveEntry(entrada('Primera', '2026-11-14T02:00:00.000Z')); // 20:00 del 13 en México
  const e2 = await repo.saveEntry(entrada('Segunda', '2026-11-14T03:30:00.000Z'));
  const e3 = await repo.saveEntry(entrada('Otro día', '2026-11-10T18:00:00.000Z'));

  assert.equal(db.journalEntry.rows[0].moodLogId, log.id);
  assert.equal(db.journalEntry.rows[1].moodLogId, null); // moodLogId es único
  assert.deepEqual([e1.date, e1.mood, e1.energy], ['2026-11-13', 5, 9]);
  assert.deepEqual([e2.date, e2.mood], ['2026-11-13', 5]);
  assert.deepEqual([e3.mood, e3.energy, e3.shared], [null, null, false]);

  const lista = await repo.findEntries(userId);
  assert.deepEqual(lista.map((e) => e.text), ['Segunda', 'Primera', 'Otro día']); // más reciente primero
});

test('diario: editar, buscar por id y borrar solo lo propio', async () => {
  const { repo } = nuevo();
  const [duena, otra] = [nuevoId(), nuevoId()];
  const e = await repo.saveEntry(
    new JournalEntry({ id: null, userId: duena, date: '2026-11-13', createdAt: '2026-11-13T20:00:00.000Z', text: 'Hola' }),
  );

  const editada = await repo.saveEntry(new JournalEntry({ ...e, text: 'Hola de nuevo', shared: true }));
  assert.deepEqual([editada.id, editada.text, editada.shared], [e.id, 'Hola de nuevo', true]);

  assert.equal(await repo.findEntryById(otra, e.id), null);
  assert.equal(await repo.findEntryById(duena, 'no-es-un-id'), null);
  await repo.deleteEntry(otra, e.id);
  assert.ok(await repo.findEntryById(duena, e.id));
  await repo.deleteEntry(duena, e.id);
  assert.equal(await repo.findEntryById(duena, e.id), null);
});

test('un usuario que no es _id de MongoDB se rechaza con 401', async () => {
  const { repo } = nuevo();
  await assert.rejects(repo.findLogByDate('u-1', '2026-11-13'), UnauthorizedError);
});
