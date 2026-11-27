const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Orígenes permitidos para CORS, separados por coma. "*" permite cualquiera
// (útil en desarrollo con la app móvil en Expo y la PWA en Vite).
function corsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? '*';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: corsOrigins(),
  // Mientras no exista el login (M00): usuario por encabezado X-User-Id o DEV_USER_ID
  allowDevAuth: nodeEnv !== 'production',
  devUserId: process.env.DEV_USER_ID || null,
  // Solo para demos: permite terminar una sesión de enfoque antes de tiempo (M03)
  allowEarlyFinish: nodeEnv !== 'production' && process.env.ALLOW_EARLY_FINISH === 'true',
  inactivity: { thresholdDays: 3, lowCompletionRate: 0.5 },
};

module.exports = { env };
