const { defineConfig } = require('prisma/config');
const { databaseUrl } = require('./src/config/database');

process.env.DATABASE_URL = databaseUrl();
module.exports = defineConfig({ schema: 'prisma/schema.prisma' });
