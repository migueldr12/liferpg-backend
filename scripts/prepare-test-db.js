// Prepara únicamente liferpg_test en el mismo clúster configurado para desarrollo.
const { spawnSync } = require('node:child_process');
const { databaseUrl } = require('../src/config/database');

const target = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
if (!process.env.TEST_DATABASE_URL) target.pathname = '/liferpg_test';
if (target.pathname !== '/liferpg_test') {
  throw new Error('TEST_DATABASE_URL debe apuntar a la base liferpg_test.');
}
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'db', 'push'], {
  env: { ...process.env, DATABASE_URL: target.toString() },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
