const { PrismaClient } = require('@prisma/client');
const { databaseUrl } = require('../../../config/database');

let client;
function getPrisma() {
  client ??= new PrismaClient({ datasourceUrl: databaseUrl() });
  return client;
}

async function disconnect() {
  await client?.$disconnect();
  client = undefined;
}

module.exports = { getPrisma, disconnect };
