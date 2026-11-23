// Prueba HTTP del login (M00) de punta a punta, como lo hace la app en modo "firebase":
// token de Firebase → sesionFirebase → /usuarios/me/cuenta → mascota → otro módulo (M06)
// atendido como el mismo usuario. Contrato: docs/API.md del móvil (sección M00).

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createUsuariosModule } = require('../../../src/modules/m00-usuarios-autenticacion');
const { PrismaUsuarioRepository } = require('../../../src/modules/m00-usuarios-autenticacion/infrastructure/repositories/PrismaUsuarioRepository');
const { createFirebaseTokenVerifier } = require('../../../src/shared/infrastructure/auth/firebaseTokenVerifier');
const { createMoodModule } = require('../../../src/modules/m06-vitalidad');
const { InMemoryMoodRepository } = require('../../support/InMemoryMoodRepository');
const { notFoundHandler } = require('../../../src/shared/middlewares/notFound');
const { errorHandler } = require('../../../src/shared/middlewares/errorHandler');
const { crearPrismaFalso } = require('../../support/prismaFalso');
const { crearFirebaseFalso } = require('../../support/firebaseFalso');

const fb = crearFirebaseFalso();
const db = crearPrismaFalso();
const animo = new InMemoryMoodRepository();
let server;
let base;

const call = async (method, path, { token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : undefined };
};

test.before(async () => {
  const m00 = createUsuariosModule({
    usuarioRepository: new PrismaUsuarioRepository({ db }),
    verifier: createFirebaseTokenVerifier({ projectId: fb.projectId, fetchImpl: fb.fetchImpl }),
    devUserId: null,
  });
  const app = express();
  app.use(express.json());
  const api = express.Router();
  api.use(m00.sesion);
  api.use('/usuarios', m00.router);
  api.use('/animo', createMoodModule({ moodRepository: animo, devUserId: null }).router);
  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(() => server.close());

test('flujo de la app: login → 404 → Crear cuenta → Bienvenida → cuenta lista', async () => {
  const token = fb.token({ uid: 'firebase-yess', email: 'yess@liferpg.mx' });

  const sinCuenta = await call('GET', '/usuarios/me/cuenta', { token });
  assert.deepEqual([sinCuenta.status, sinCuenta.body.code], [404, 'NOT_FOUND']);

  const creada = await call('POST', '/usuarios/me/cuenta', {
    token,
    body: { firstName: 'Yess', lastName: 'Ramírez', age: 21, gender: 'mujer', goals: ['lectura'], customGoal: null },
  });
  assert.equal(creada.status, 201);
  assert.deepEqual(Object.keys(creada.body).sort(), ['age', 'createdAt', 'customGoal', 'email', 'firstName', 'gender', 'goals', 'id', 'lastName', 'pet', 'petColor', 'photoUrl']);
  assert.deepEqual([creada.body.id, creada.body.email, creada.body.pet, creada.body.petColor], ['firebase-yess', 'yess@liferpg.mx', null, 'verde']);

  const conMascota = await call('PUT', '/usuarios/me/mascota', { token, body: { pet: 'hamster' } });
  assert.deepEqual([conMascota.status, conMascota.body.pet], [200, 'hamster']);
  assert.equal((await call('PUT', '/usuarios/me/mascota', { token, body: { pet: 'gato' } })).status, 400);

  const editada = await call('PUT', '/usuarios/me/cuenta', { token, body: { petColor: 'naranja', goals: ['ejercicio', 'sueno'] } });
  assert.deepEqual([editada.status, editada.body.petColor, editada.body.goals], [200, 'naranja', ['ejercicio', 'sueno']]);
  assert.equal((await call('PUT', '/usuarios/me/cuenta', { token, body: {} })).status, 400);

  // Otro celular, mismo usuario de Firebase: ya tiene su cuenta y su animal
  const otroToken = fb.token({ uid: 'firebase-yess', email: 'yess@liferpg.mx' });
  const deNuevo = await call('GET', '/usuarios/me/cuenta', { token: otroToken });
  assert.deepEqual([deNuevo.status, deNuevo.body.pet, deNuevo.body.firstName], [200, 'hamster', 'Yess']);
  assert.equal(db.user.rows.length, 1);
});

test('la misma sesión sirve en los demás módulos: el ánimo queda a nombre del usuario de la base', async () => {
  const token = fb.token({ uid: 'firebase-yess', email: 'yess@liferpg.mx' });
  const r = await call('POST', '/animo', { token, body: { mood: 4, energy: 7 } });
  assert.equal(r.status, 201);
  const usuario = db.user.rows[0];
  assert.equal([...animo.logs.values()][0].userId, usuario.id);
});

test('cada usuario de Firebase ve solo su cuenta', async () => {
  const token = fb.token({ uid: 'firebase-ana', email: 'ana@liferpg.mx' });
  assert.equal((await call('GET', '/usuarios/me/cuenta', { token })).status, 404);
  assert.equal(db.user.rows.length, 2);
});

test('sin sesión o con un token inválido o vencido responde 401 con el mensaje para la app', async () => {
  assert.equal((await call('GET', '/usuarios/me/cuenta')).status, 401);
  const vencido = fb.token({ claims: { exp: Math.floor(Date.now() / 1000) - 7200 } });
  for (const path of ['/usuarios/me/cuenta', '/animo/hoy']) {
    const r = await call('GET', path, { token: vencido });
    assert.deepEqual([r.status, r.body.code], [401, 'UNAUTHORIZED']);
    assert.match(r.body.error, /expiró/);
  }
  assert.equal((await call('GET', '/animo/hoy', { token: 'basura' })).status, 401);
});
