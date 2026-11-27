// Arranque local para la demo: nunca usa la base normal de la aplicación.
const { databaseUrl } = require('../src/config/database');
const target = new URL(process.env.TEST_DATABASE_URL || databaseUrl());
if (!process.env.TEST_DATABASE_URL) target.pathname = '/liferpg_test';
if (target.pathname !== '/liferpg_test') throw new Error('La demo debe usar la base liferpg_test.');
process.env.DATABASE_URL = target.toString();
process.env.NODE_ENV = 'development';
process.env.DEV_USER_ID = '670000000000000000000001';
process.env.HOST = '0.0.0.0';
process.env.CORS_ORIGINS = '*';
// Los usuarios simulados no deben enviar notificaciones a dispositivos reales.
process.env.FCM_PROJECT_ID = '';
process.env.FCM_CLIENT_EMAIL = '';
process.env.FCM_PRIVATE_KEY = '';
require('../src/server');
