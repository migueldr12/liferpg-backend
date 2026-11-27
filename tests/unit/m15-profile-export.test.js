const test = require('node:test');
const assert = require('node:assert/strict');
const { createProfileExportService } = require('../../src/modules/m15-gestion-bd/application/services/profileExportService');
const { createProfileExportRepository } = require('../../src/modules/m15-gestion-bd/infrastructure/repositories/profileExportRepository');

const userId = 'aaaaaaaaaaaaaaaaaaaaaaaa';

test('exportación valida alcance y no exporta usuarios inexistentes', async () => {
  const service = createProfileExportService({ exportProfiles: async () => ({ users: [] }) });
  await assert.rejects(service.exportProfiles({ userIds: ['incorrecto'], sections: ['profile'] }), { status: 400 });
  await assert.rejects(service.exportProfiles({ userIds: [userId], sections: ['secrets'] }), { status: 400 });
  await assert.rejects(service.exportProfiles({ userIds: [userId], sections: ['profile'] }), { status: 404 });
});

test('exportación solo consulta las secciones elegidas y no solicita credenciales', async () => {
  const calls = [];
  const model = (name) => ({ findMany: async (query) => { calls.push({ name, query }); return []; } });
  const db = Object.fromEntries(['playerProfile', 'outfit', 'habit', 'habitCheckIn', 'mission', 'focusSession', 'inventoryEntry'].map((name) => [name, model(name)]));
  db.user = { findMany: async (query) => { calls.push({ name: 'user', query }); return [{ id: userId }]; } };
  const service = createProfileExportService(createProfileExportRepository(() => db), () => new Date('2026-01-01T00:00:00Z'));
  const result = await service.exportProfiles({ userIds: [userId, userId], sections: ['habits'] });
  assert.deepEqual(calls.map((call) => call.name), ['user', 'habit', 'habitCheckIn']);
  assert.equal(calls[0].query.select.passwordHash, undefined);
  assert.deepEqual(result.sections, ['habits']);
  assert.equal(result.exportedAt, '2026-01-01T00:00:00.000Z');
});
