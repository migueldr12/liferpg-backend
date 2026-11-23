const express = require('express');
const { notFoundHandler } = require('../../src/shared/middlewares/notFound');
const { errorHandler } = require('../../src/shared/middlewares/errorHandler');

// Enciende una API mínima en un puerto libre con los mismos middlewares de errores que
// src/app.js. montar(router) agrega los routers del módulo bajo /api/v1.
// Devuelve call(method, path, body, userId) y apagar().
async function encender(montar) {
  const app = express();
  app.use(express.json());
  const api = express.Router();
  montar(api);
  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;

  const call = async (method, path, body, userId) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(userId && { 'x-user-id': userId }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : undefined };
  };

  return { call, apagar: () => server.close() };
}

module.exports = { encender };
