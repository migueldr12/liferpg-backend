// Ejecuta seeds de usuarios de prueba únicamente en la base aislada.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { databaseUrl } = require('../src/config/database');

const seeds = { m04: ['seed-m04.js', '--with-test-user'], m10: ['seed-m10.js'], demo: ['seed-demo.js'] };
const seed = seeds[process.argv[2]];
if (!seed) throw new Error('Selecciona el seed m04, m10 o demo.');
const target = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
if (!process.env.TEST_DATABASE_URL) target.pathname = '/liferpg_test';
if (target.pathname !== '/liferpg_test') throw new Error('La base de pruebas debe llamarse liferpg_test.');
const result = spawnSync(process.execPath, [path.join(__dirname, seed[0]), ...seed.slice(1)], {
  env: { ...process.env, DATABASE_URL: target.toString(), NODE_ENV: 'test' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
