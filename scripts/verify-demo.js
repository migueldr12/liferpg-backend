// Consulta las rutas de la demo en una API temporal sin tocar la base normal.
const { databaseUrl } = require('../src/config/database');
const target = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
if (!process.env.TEST_DATABASE_URL) target.pathname = '/liferpg_test';
if (target.pathname !== '/liferpg_test') throw new Error('La verificación requiere liferpg_test.');
process.env.DATABASE_URL = target.toString();
process.env.NODE_ENV = 'development';
const { createApp } = require('../src/app');
const { disconnect } = require('../src/shared/infrastructure/database/prisma');

async function main() {
  const server = await new Promise((resolve) => { const instance = createApp().listen(0, '127.0.0.1', () => resolve(instance)); });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  try {
    const checks = [
      ['/usuarios/me/sesion', '670000000000000000000001'],
      ['/visualizador-usuarios/party', '670000000000000000000001'],
      ['/botin/cofre', '670000000000000000000001'],
      ['/diario/actividades', '670000000000000000000001'],
      ['/notificaciones/stickers/catalogo', '670000000000000000000001'],
      ['/notificaciones/avisos-inactividad', '670000000000000000000001'],
      ['/resumen-progreso/pendientes', '670000000000000000000001'],
      ['/retos', '670000000000000000000001'],
      ['/economia/curva', '670000000000000000000004'],
    ];
    for (const [path, userId] of checks) {
      const response = await fetch(base + path, { headers: { 'x-user-id': userId } });
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${await response.text()}`);
      console.log(`${path}: ${response.status}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
