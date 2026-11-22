const express = require('express');
const { createMoodModule } = require('../../src/modules/m06-vitalidad');
const { notFoundHandler } = require('../../src/shared/middlewares/notFound');
const { errorHandler } = require('../../src/shared/middlewares/errorHandler');

// Enciende una API mínima con el M06 en /api/v1/animo y los mismos middlewares de errores
// que src/app.js, con el repositorio y el reloj que pase la prueba. Devuelve cómo llamarla.
async function encenderAnimo({ moodRepository, now }) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/animo', createMoodModule({ moodRepository, now }).router);
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

module.exports = { encenderAnimo };
