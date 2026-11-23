// Pruebas del M00: verificador de tokens de Firebase y casos de uso de la cuenta
// (repositorio Prisma real sobre el cliente falso). Sin internet ni Atlas.

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { createFirebaseTokenVerifier } = require('../../../src/shared/infrastructure/auth/firebaseTokenVerifier');
const { createUsuariosModule } = require('../../../src/modules/m00-usuarios-autenticacion');
const { PrismaUsuarioRepository } = require('../../../src/modules/m00-usuarios-autenticacion/infrastructure/repositories/PrismaUsuarioRepository');
const { crearPrismaFalso } = require('../../support/prismaFalso');
const { crearFirebaseFalso } = require('../../support/firebaseFalso');

const fb = crearFirebaseFalso();
const verifier = createFirebaseTokenVerifier({ projectId: fb.projectId, fetchImpl: fb.fetchImpl });
const CUENTA = { firstName: 'Yess', lastName: 'Ramírez', age: 21, gender: 'mujer', goals: ['lectura', 'enfoque'], customGoal: null };

const nuevo = ({ allowUnverifiedLink = true } = {}) => {
  const db = crearPrismaFalso();
  const { services } = createUsuariosModule({
    now: () => new Date('2026-11-23T08:00:00Z'),
    usuarioRepository: new PrismaUsuarioRepository({ db }),
    verifier,
    allowUnverifiedLink,
    devUserId: null,
  });
  return { db, services };
};

// ───────── Verificador de tokens ─────────

test('RDF006: un token válido de Firebase da el uid, correo y proveedor', async () => {
  const datos = await verifier.verify(fb.token({ uid: 'abc', email: 'Yess@LifeRPG.mx', verified: true, provider: 'google.com', name: 'Yess R' }));
  assert.deepEqual(datos, { uid: 'abc', email: 'yess@liferpg.mx', emailVerified: true, name: 'Yess R', picture: null, provider: 'google.com' });
});

test('tokens rechazados con 401: otro proyecto, vencido, firma falsa, llave desconocida o mal formado', async () => {
  const ahora = Math.floor(Date.now() / 1000);
  const { privateKey: otra } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const casos = [
    [fb.token({ claims: { aud: 'otro-proyecto' } }), /otro proyecto/],
    [fb.token({ claims: { exp: ahora - 3600 } }), /expiró/],
    [fb.token({ otraLlave: otra }), /no es válida/],
    [fb.token({ kid: 'no-existe' }), /no es válida/],
    [fb.token({ claims: { sub: '' } }), /no es válida/],
    ['abc.def', /no es válida/],
  ];
  for (const [token, mensaje] of casos) {
    await assert.rejects(verifier.verify(token), (err) => err.status === 401 && mensaje.test(err.message));
  }
  // Sin Project ID el servidor avisa qué falta
  await assert.rejects(createFirebaseTokenVerifier({ projectId: '' }).verify('x.y.z'), /FIREBASE_PROJECT_ID/);
});

test('las llaves públicas de Google se guardan en caché', async () => {
  const propio = crearFirebaseFalso();
  const v = createFirebaseTokenVerifier({ projectId: propio.projectId, fetchImpl: propio.fetchImpl });
  await v.verify(propio.token());
  await v.verify(propio.token());
  assert.equal(propio.descargas(), 1);
});

// ───────── Usuario de la base ─────────

test('primer inicio de sesión crea al usuario; los siguientes lo encuentran por uid', async () => {
  const { db, services } = nuevo();
  const a = await services.identificarUsuarioFirebase({ uid: 'u1', email: 'nuevo@liferpg.mx', name: 'Nuevo Jugador' });
  const b = await services.identificarUsuarioFirebase({ uid: 'u1', email: 'nuevo@liferpg.mx' });
  assert.equal(a.id, b.id);
  assert.equal(db.user.rows.length, 1);
  assert.deepEqual([db.user.rows[0].firebaseUid, db.user.rows[0].displayName, db.user.rows[0].role], ['u1', 'Nuevo Jugador', 'PLAYER']);
  assert.equal(a.account, null);
});

test('un usuario que ya existía con ese correo se liga (no se duplica)', async () => {
  const { db, services } = nuevo();
  const viejo = await db.user.create({ data: { email: 'dev.yess@liferpg.test', displayName: 'Yess', passwordHash: 'x' } });
  const u = await services.identificarUsuarioFirebase({ uid: 'u2', email: 'DEV.yess@liferpg.test' });
  assert.equal(u.id, viejo.id);
  assert.equal(db.user.rows[0].firebaseUid, 'u2');
  // Otro uid con el mismo correo ya no puede tomarlo
  await assert.rejects(services.identificarUsuarioFirebase({ uid: 'u3', email: 'dev.yess@liferpg.test' }), { status: 409 });
});

test('en producción solo se liga por correo si está verificado o es Google', async () => {
  const { db, services } = nuevo({ allowUnverifiedLink: false });
  await db.user.create({ data: { email: 'ana@liferpg.mx', displayName: 'Ana' } });
  await assert.rejects(services.identificarUsuarioFirebase({ uid: 'x', email: 'ana@liferpg.mx', emailVerified: false, provider: 'password' }), /Verifica tu correo/);
  const u = await services.identificarUsuarioFirebase({ uid: 'x', email: 'ana@liferpg.mx', emailVerified: false, provider: 'google.com' });
  assert.equal(db.user.rows.find((r) => r.id === u.id).firebaseUid, 'x');
});

// ───────── Cuenta y mascota ─────────

test('RDF001: sin cuenta da 404; se crea una vez; valida los datos', async () => {
  const { db, services } = nuevo();
  const { id } = await services.identificarUsuarioFirebase({ uid: 'u1', email: 'yess@liferpg.mx' });
  await assert.rejects(services.consultarCuenta(id), { status: 404 });

  const u = await services.crearCuenta(id, CUENTA);
  assert.deepEqual([u.account.firstName, u.account.goals, u.account.petColor, u.pet], ['Yess', ['lectura', 'enfoque'], 'verde', null]);
  assert.equal(db.user.rows[0].displayName, 'Yess Ramírez');
  await assert.rejects(services.crearCuenta(id, CUENTA), { status: 409 });

  const { id: otro } = await services.identificarUsuarioFirebase({ uid: 'u9', email: 'otro@liferpg.mx' });
  for (const malo of [{ age: 0 }, { gender: 'x' }, { goals: ['volar'] }, { goals: [], customGoal: '' }, { firstName: ' ' }, { lastName: 'x'.repeat(41) }]) {
    await assert.rejects(services.crearCuenta(otro, { ...CUENTA, ...malo }), { status: 400 });
  }
  assert.equal((await services.crearCuenta(otro, { ...CUENTA, goals: [], customGoal: 'Aprender guitarra' })).account.customGoal, 'Aprender guitarra');
});

test('elegir mascota una sola vez: nace el perfil del jugador con su animal, nombre y color', async () => {
  const { db, services } = nuevo();
  const { id } = await services.identificarUsuarioFirebase({ uid: 'u1', email: 'yess@liferpg.mx' });
  await assert.rejects(services.elegirMascota(id, 'dragon'), { status: 404 }); // primero la cuenta
  await services.crearCuenta(id, CUENTA);
  await services.actualizarCuenta(id, { petColor: 'morado' });
  await assert.rejects(services.elegirMascota(id, 'unicornio'), { status: 400 });

  const u = await services.elegirMascota(id, 'dragon');
  assert.equal(u.pet, 'dragon');
  const perfil = db.playerProfile.rows[0];
  assert.deepEqual([perfil.userId, perfil.alias, perfil.mascotName, perfil.species, perfil.mascotColor], [id, 'Yess', 'Draco', 'DRAGON', 'PURPLE']);
  await assert.rejects(services.elegirMascota(id, 'gato'), /Ya elegiste/);

  // Mi perfil: el color y la foto también pasan al perfil del jugador
  const editado = await services.actualizarCuenta(id, { petColor: 'azul', photoUrl: 'file:///foto.jpg', age: 22 });
  assert.deepEqual([editado.account.age, editado.account.petColor, editado.pet], [22, 'azul', 'dragon']);
  assert.deepEqual([db.playerProfile.rows[0].mascotColor, db.playerProfile.rows[0].avatarUrl], ['BLUE', 'file:///foto.jpg']);
});

test('un usuario de prueba que ya tenía perfil sin animal elige mascota sin duplicar el perfil', async () => {
  const { db, services } = nuevo();
  const user = await db.user.create({ data: { email: 'dev@liferpg.test', displayName: 'Dev' } });
  await db.playerProfile.create({ data: { userId: user.id, alias: 'Dev', mascotName: 'Viejo', mascotColor: '#123456' } });
  await services.crearCuenta(user.id, CUENTA);
  await services.elegirMascota(user.id, 'leon');
  assert.equal(db.playerProfile.rows.length, 1);
  assert.equal(db.playerProfile.rows[0].species, 'LION');
});
