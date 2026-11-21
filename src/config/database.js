const path = require('node:path');
const dotenv = require('dotenv');

function databaseUrl() {
  const root = path.resolve(__dirname, '../..');
  dotenv.config({ path: path.join(root, '.env') });
  const connection = process.env.DATABASE_URL || process.env.MONGODB_URI ||
    dotenv.config({ path: path.join(root, 'atlas-credentials.env'), processEnv: {} }).parsed?.MONGODB_URI;
  if (!connection) throw new Error('Configura DATABASE_URL o atlas-credentials.env.');
  try {
    const url = new URL(connection);
    if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)) throw new Error();
    if (!url.pathname.slice(1)) url.pathname = '/liferpg';
    return url.toString();
  } catch {
    throw new Error('La URI de MongoDB no es válida.');
  }
}

module.exports = { databaseUrl };
