const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { databaseUrl } = require('../../src/config/database');
const { createActivityRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/activityRepository');
const { createAlertRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/alertRepository');
const { createStickerRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/stickerRepository');
const { createFriendshipRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/friendshipRepository');
const { createUserRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/userRepository');
const { createNotificationsRouter } = require('../../src/modules/m10-notificaciones/interfaces/routes');
const { encender } = require('../support/servidorPrueba');

test('M10 encuentra usuarios y avisos cuyo campo opcional no existe en MongoDB', { skip: process.env.RUN_MONGO_INTEGRATION !== '1' }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
  if (!process.env.TEST_DATABASE_URL) url.pathname = '/liferpg_test';
  assert.equal(url.pathname, '/liferpg_test');
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  let user;
  try {
    user = await db.user.create({ data: { email: `inactividad-${randomUUID()}@liferpg.test`, displayName: 'Prueba M10', createdAt: new Date('2020-01-01') } });
    const alert = await db.inactivityAlert.create({ data: { userId: user.id, message: 'Prueba', thresholdDays: 3 } });
    const candidates = await createActivityRepository(() => db).listCandidates({ createdBefore: new Date('2021-01-01') });
    assert.ok(candidates.some((item) => item.id === user.id));
    const repository = createAlertRepository(() => db);
    assert.ok((await repository.findOpenUserIds([user.id])).has(user.id));
    assert.equal((await repository.list({ userIds: [user.id], includeResolved: false, skip: 0, take: 20 })).items[0].id, alert.id);
    assert.equal(await repository.resolveOpenForUsers([user.id]), 1);
    assert.equal((await repository.findOpenUserIds([user.id])).size, 0);
  } finally {
    if (user) {
      await db.inactivityAlert.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    await db.$disconnect();
  }
});

test('M10 envía y marca visto un sticker entre amigos en MongoDB', { skip: process.env.RUN_MONGO_INTEGRATION !== '1' }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
  if (!process.env.TEST_DATABASE_URL) url.pathname = '/liferpg_test';
  assert.equal(url.pathname, '/liferpg_test');
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const key = randomUUID();
  let sender, recipient, category, sticker, server;
  try {
    sender = await db.user.create({ data: { email: `sender-${key}@liferpg.test`, displayName: 'Remitente' } });
    recipient = await db.user.create({ data: { email: `recipient-${key}@liferpg.test`, displayName: 'Destinatario' } });
    await db.friendship.create({ data: { requesterId: sender.id, addresseeId: recipient.id, pairKey: key, status: 'ACCEPTED' } });
    category = await db.catalogCategory.create({ data: { name: `Prueba ${key}`, type: 'STICKER' } });
    sticker = await db.catalogItem.create({ data: { name: 'Ánimo', group: 'stickers', icon: 'sticker.test', categoryId: category.id } });
    const getDb = () => db;
    const repositories = { users: createUserRepository(getDb), friends: createFriendshipRepository(getDb), stickers: createStickerRepository(getDb), alerts: createAlertRepository(getDb), activity: createActivityRepository(getDb) };
    server = await encender((api) => api.use('/notificaciones', createNotificationsRouter({ repositories, push: { notifyUsers: async () => ({ sent: 0 }) } })));
    const sent = await server.call('POST', '/notificaciones/stickers', { recipientIds: [recipient.id], catalogItemId: sticker.id }, sender.id);
    assert.equal(sent.status, 201);
    const history = await server.call('GET', '/notificaciones/stickers/historial?tipo=recibidos&soloNoVistos=true', undefined, recipient.id);
    assert.equal(history.status, 200);
    assert.equal(history.body.length, 1);
    assert.equal((await server.call('PATCH', '/notificaciones/stickers/visto', {}, recipient.id)).body.updated, 1);
    const unseen = await server.call('GET', '/notificaciones/stickers/historial?tipo=recibidos&soloNoVistos=true', undefined, recipient.id);
    assert.equal(unseen.body.length, 0);
  } finally {
    server?.apagar();
    if (sender) await db.stickerMessage.deleteMany({ where: { senderId: sender.id } });
    if (sender) await db.friendship.deleteMany({ where: { requesterId: sender.id } });
    if (sticker) await db.catalogItem.delete({ where: { id: sticker.id } });
    if (category) await db.catalogCategory.delete({ where: { id: category.id } });
    if (recipient) await db.user.delete({ where: { id: recipient.id } });
    if (sender) await db.user.delete({ where: { id: sender.id } });
    await db.$disconnect();
  }
});
