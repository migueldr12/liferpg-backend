const test = require('node:test');
const assert = require('node:assert/strict');
const { encender } = require('../support/servidorPrueba');
const { createNotificationsRouter } = require('../../src/modules/m10-notificaciones/interfaces/routes');

test('M10 requiere identidad y devuelve avisos solo del usuario y sus amigos', async () => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  let requestedIds;
  const repositories = {
    users: {}, stickers: {}, activity: {},
    friends: { listFriendIds: async () => ['bbbbbbbbbbbbbbbbbbbbbbbb'] },
    alerts: { list: async ({ userIds }) => { requestedIds = userIds; return { items: [], total: 0 }; } },
  };
  const server = await encender((api) => api.use('/notificaciones', createNotificationsRouter({ repositories, push: {} })));
  try {
    assert.equal((await server.call('GET', '/notificaciones/avisos-inactividad')).status, 401);
    assert.equal((await server.call('GET', '/notificaciones/avisos-inactividad', undefined, id)).status, 200);
    assert.deepEqual(requestedIds, [id, 'bbbbbbbbbbbbbbbbbbbbbbbb']);
  } finally { server.apagar(); }
});
