const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { currentUser } = require('../../src/shared/middlewares/currentUser');

// Ejecuta el middleware con un x-user-id y devuelve { user, error }
function run(options, header) {
  const req = { get: (name) => (name.toLowerCase() === 'x-user-id' ? header : undefined) };
  let error;
  currentUser(options)(req, {}, (err) => { error = err; });
  return { user: req.user, error };
}

const DEV = '6'.repeat(24);
const OTHER = 'a'.repeat(24);

describe('currentUser (temporal hasta el M00)', () => {
  test('un id de MongoDB en x-user-id se usa tal cual', () => {
    assert.equal(run({ allowDevHeader: true, devUserId: DEV }, OTHER).user.id, OTHER);
  });

  test('"u-1" de la app se traduce al usuario de prueba de DEV_USER_ID', () => {
    assert.equal(run({ allowDevHeader: true, devUserId: DEV }, 'u-1').user.id, DEV);
  });

  test('sin encabezado también usa DEV_USER_ID', () => {
    assert.equal(run({ allowDevHeader: true, devUserId: DEV }, undefined).user.id, DEV);
  });

  test('"u-1" sin DEV_USER_ID responde 401 con instrucciones', () => {
    const { user, error } = run({ allowDevHeader: true, devUserId: null }, 'u-1');
    assert.equal(user, undefined);
    assert.equal(error.status, 401);
    assert.match(error.message, /DEV_USER_ID/);
  });

  test('en producción no se acepta el encabezado', () => {
    const { error } = run({ allowDevHeader: false, devUserId: DEV }, OTHER);
    assert.equal(error.status, 401);
  });
});

// La misma regla para los controladores que no montan el middleware (M02 · hábitos).
describe('userIdFromRequest', () => {
  const { userIdFromRequest } = require('../../src/shared/middlewares/currentUser');
  const reqWith = (headers = {}, extra = {}) => ({ headers, ...extra });

  test('con sesión de Firebase manda el usuario de la sesión', () => {
    assert.equal(userIdFromRequest(reqWith({ 'x-user-id': OTHER }, { user: { id: 'sesion' } }), { allowDevHeader: true, devUserId: DEV }), 'sesion');
  });

  test('un token inválido responde 401 aunque haya encabezado', () => {
    const authError = Object.assign(new Error('La sesión no es válida.'), { status: 401 });
    assert.throws(() => userIdFromRequest(reqWith({ 'x-user-id': OTHER }, { authError }), { allowDevHeader: true, devUserId: DEV }), { status: 401 });
  });

  test('en desarrollo acepta x-user-id (también sin req.get) y "u-1"', () => {
    assert.equal(userIdFromRequest(reqWith({ 'x-user-id': OTHER }), { allowDevHeader: true, devUserId: DEV }), OTHER);
    assert.equal(userIdFromRequest(reqWith({ 'x-user-id': 'u-1' }), { allowDevHeader: true, devUserId: DEV }), DEV);
  });

  test('en producción, sin token, 401 (ya no cae en el usuario de prueba)', () => {
    assert.throws(() => userIdFromRequest(reqWith({ 'x-user-id': 'u-1' }), { allowDevHeader: false, devUserId: DEV }), { status: 401 });
    assert.throws(() => userIdFromRequest(reqWith(), { allowDevHeader: false, devUserId: DEV }), { status: 401 });
  });
});
