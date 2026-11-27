const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { databaseUrl } = require('../../src/config/database');
const { createProfileExportRepository } = require('../../src/modules/m15-gestion-bd/infrastructure/repositories/profileExportRepository');
const { createProfileExportService } = require('../../src/modules/m15-gestion-bd/application/services/profileExportService');

test('exporta datos reales de un perfil aislado en liferpg_test', { skip: process.env.RUN_MONGO_INTEGRATION !== '1' }, async () => {
  const url = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
  if (!process.env.TEST_DATABASE_URL) url.pathname = '/liferpg_test';
  assert.equal(url.pathname, '/liferpg_test');
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  let user;
  try {
    user = await db.user.create({ data: { email: `export-${randomUUID()}@liferpg.test`, displayName: 'Prueba exportación' } });
    await db.playerProfile.create({ data: { userId: user.id, alias: 'prueba', mascotName: 'Prueba', mascotColor: 'verde' } });
    const service = createProfileExportService(createProfileExportRepository(() => db));
    const result = await service.exportProfiles({ userIds: [user.id], sections: ['profile'] });
    assert.equal(result.data.users[0].id, user.id);
    assert.equal(result.data.profiles[0].alias, 'prueba');
    assert.equal(result.data.users[0].passwordHash, undefined);
  } finally {
    if (user) {
      await db.playerProfile.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    await db.$disconnect();
  }
});
