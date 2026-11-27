const test = require('node:test');
const assert = require('node:assert/strict');
const { encender } = require('../support/servidorPrueba');
const { createDataRouter } = require('../../src/modules/m15-gestion-bd/interfaces/routes');
const { requireAdmin } = require('../../src/shared/middlewares/requireAdmin');

test('exportación administrativa rechaza usuarios sin privilegios', async () => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const service = { listProfiles: async () => [{ id }], exportProfiles: async () => ({ data: {} }) };
  const admin = requireAdmin({ findRole: async (userId) => userId === id ? 'ADMIN' : 'PLAYER' });
  const server = await encender((api) => api.use('/admin/data', createDataRouter({ service, admin })));
  try {
    assert.equal((await server.call('GET', '/admin/data/profiles')).status, 401);
    assert.equal((await server.call('GET', '/admin/data/profiles', undefined, 'bbbbbbbbbbbbbbbbbbbbbbbb')).status, 403);
    assert.equal((await server.call('GET', '/admin/data/profiles', undefined, id)).status, 200);
    assert.equal((await server.call('POST', '/admin/data/exports', {}, id)).status, 200);
  } finally { server.apagar(); }
});
