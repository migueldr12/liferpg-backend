const test = require('node:test');
const assert = require('node:assert/strict');
const { createEnviarSticker } = require('../../src/modules/m10-notificaciones/application/services/enviarSticker');
const { createActivityRepository } = require('../../src/modules/m10-notificaciones/infrastructure/repositories/activityRepository');
const { createPushService } = require('../../src/shared/infrastructure/push/pushService');

test('M10 entrega solo a amigos y usa el nombre de la sesión persistida', async () => {
  const sent = [];
  const person = (id) => ({ id, displayName: id, profile: null });
  const send = createEnviarSticker({
    users: { findAuthUser: async () => ({ displayName: 'Ana' }) },
    friends: { listFriendIds: async () => ['friend'] },
    stickers: {
      findStickerItem: async () => ({ name: 'Ánimo' }),
      createMany: async ({ senderId, recipientIds }) => recipientIds.map((recipientId) => ({
        id: 'msg', senderId, sender: person(senderId), recipient: person(recipientId),
        catalogItem: { id: 'item', name: 'Ánimo', category: null },
      })),
    },
    push: { notifyUsers: async (ids, notification) => { sent.push({ ids, notification }); } },
  });
  await assert.rejects(send({ senderId: 'ana', recipientIds: ['stranger'], catalogItemId: 'item' }), { status: 403 });
  await send({ senderId: 'ana', recipientIds: ['friend'], catalogItemId: 'item' });
  assert.match(sent[0].notification.title, /^Ana /);
  assert.deepEqual(sent[0].ids, ['friend']);
});

test('M10 interpreta el 1 % de cumplimiento como 0.01', async () => {
  const repo = createActivityRepository(() => ({ dailyClosure: { findMany: async () => [{ userId: 'a', completionRate: 1 }] } }));
  assert.deepEqual((await repo.completionRatesByUser({ since: new Date() })).get('a'), [0.01]);
});

test('push sin configurar no consulta dispositivos ni impide guardar el mensaje', async () => {
  const push = createPushService({ db: () => { throw new Error('no debe consultar'); }, client: { isConfigured: () => false } });
  assert.deepEqual(await push.notifyUsers(['a'], { title: 'Ánimo' }), { sent: 0, failed: 0 });
});
