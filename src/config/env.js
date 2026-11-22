const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Orígenes permitidos para CORS, separados por coma. "*" permite cualquiera
// (útil en desarrollo con la app móvil en Expo y la PWA en Vite).
function corsOrigins() {
  const raw = process.env.CORS_ORIGINS ?? '*';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: corsOrigins(),
};

module.exports = { env };
