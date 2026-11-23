const { createApp } = require('./app');
const { env } = require('./config/env');
const { disconnect } = require('./shared/infrastructure/database/prisma');

const server = createApp().listen(env.port, env.host, () => {
  const shown = env.host === '0.0.0.0' ? 'localhost' : env.host;
  console.log(`Life-RPG API en http://${shown}:${env.port}/api/v1 (${env.nodeEnv})`);
});

// Cierra el puerto y la conexión a MongoDB al detener el proceso (Ctrl+C o el hosting).
async function shutdown(signal) {
  console.log(`${signal} recibido, cerrando…`);
  server.close();
  await disconnect();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
