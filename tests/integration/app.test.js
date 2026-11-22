const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

// Pruebas de la base del servidor sin tocar MongoDB: la consulta a la base se
// reemplaza con un doble que responde bien o falla.
function startApp(pingDatabase) {
  return new Promise((resolve) => {
    const server = createApp({ pingDatabase }).listen(0, '127.0.0.1', () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}/api/v1` });
    });
  });
}

describe('API base', () => {
  let ok;
  let down;

  before(async () => {
    ok = await startApp(async () => ({ ok: 1 }));
    down = await startApp(async () => { throw new Error('sin conexión'); });
  });

  after(() => {
    ok.server.close();
    down.server.close();
  });

  test('GET /health responde ok cuando la base contesta', async () => {
    const res = await fetch(`${ok.url}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.database, 'ok');
    assert.equal(typeof body.version, 'string');
  });

  test('GET /health responde 503 cuando la base no contesta', async () => {
    const res = await fetch(`${down.url}/health`);
    const body = await res.json();
    assert.equal(res.status, 503);
    assert.equal(body.status, 'degraded');
    assert.equal(body.database, 'error');
  });

  test('una ruta inexistente devuelve 404 con el formato de error', async () => {
    const res = await fetch(`${ok.url}/no-existe`);
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
    assert.match(body.error.message, /GET \/api\/v1\/no-existe/);
  });

  test('un cuerpo que no es JSON devuelve 400', async () => {
    const res = await fetch(`${ok.url}/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ esto no es json',
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.error.code, 'BAD_REQUEST');
  });

  test('el preflight de CORS responde 204', async () => {
    const res = await fetch(`${ok.url}/health`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });
});
