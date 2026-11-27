const test = require('node:test');
const assert = require('node:assert/strict');
const { encender } = require('../support/servidorPrueba');
const { createHostRouter } = require('../../src/modules/m13-sincronizacion-red/interfaces/routes');
const { requireAdmin } = require('../../src/shared/middlewares/requireAdmin');
const { sanitizePath } = require('../../src/modules/m13-sincronizacion-red/infrastructure/requestEvents');

test('M13 solo permite a administradores consultar dispositivos y eventos', async () => {
  const adminId = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const admin = requireAdmin({ findRole: async (id) => id === adminId ? 'ADMIN' : 'PLAYER' });
  const repository = { listDevices: async () => [{ platform: 'android' }] };
  const server = await encender((api) => api.use('/admin/host', createHostRouter({ admin, repository, requests: () => [] })));
  try {
    assert.equal((await server.call('GET', '/admin/host/clients')).status, 401);
    assert.equal((await server.call('GET', '/admin/host/logs', undefined, 'bbbbbbbbbbbbbbbbbbbbbbbb')).status, 403);
    assert.deepEqual((await server.call('GET', '/admin/host/clients', undefined, adminId)).body, [{ platform: 'android' }]);
    assert.deepEqual((await server.call('GET', '/admin/host/logs', undefined, adminId)).body, []);
  } finally { server.apagar(); }
});

test('las rutas del registro ocultan identificadores y otros valores arbitrarios', () => {
  assert.equal(sanitizePath('/api/v1/diario/actividades/mision-abcdef/notas'), '/api/v1/diario/actividades/:param/notas');
  assert.equal(sanitizePath('/api/v1/usuarios/alguien@example.com'), '/api/v1/usuarios/:param');
});
