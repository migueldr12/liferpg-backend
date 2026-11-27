const { spawnSync } = require('node:child_process');

// Las pruebas no deben heredar el modo de producción ni el usuario de la demo.
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test', DEV_USER_ID: '', RUN_MONGO_INTEGRATION: process.env.RUN_MONGO_INTEGRATION || '0' },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
