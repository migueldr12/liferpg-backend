const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { getPrisma } = require('../../shared/infrastructure/database/prisma');
const { createFirebaseTokenVerifier } = require('../../shared/infrastructure/auth/firebaseTokenVerifier');
const { PrismaUsuarioRepository } = require('./infrastructure/repositories/PrismaUsuarioRepository');
const { makeCuentaServices } = require('./application/services/cuenta');
const { makeCuentaController } = require('./interfaces/controllers/cuentaController');
const { makeCuentaRouter } = require('./interfaces/routes/cuentaRoutes');
const { makeSesionFirebase } = require('./interfaces/middlewares/sesionFirebase');

// Punto de entrada del M00 (Usuarios y autenticación) con Firebase Authentication.
// El router raíz (src/routes/index.js) usa:
//   - sesion: middleware que convierte el token de Firebase en req.user (todas las rutas)
//   - router: /usuarios/me/cuenta y /usuarios/me/mascota
//
// - verifier: valida el ID token (src/shared/infrastructure/auth/firebaseTokenVerifier.js)
// - allowUnverifiedLink: fuera de producción permite ligar por correo sin verificar
//   (para los usuarios de prueba de Atlas). En producción exige correo verificado o Google.

function createUsuariosModule({
  now = () => new Date(),
  usuarioRepository = new PrismaUsuarioRepository({ db: getPrisma }),
  verifier = createFirebaseTokenVerifier(),
  allowUnverifiedLink = env.nodeEnv !== 'production',
  devUserId = env.devUserId ?? process.env.DEV_USER_ID ?? null,
} = {}) {
  const services = makeCuentaServices({ usuarioRepository, clock: now, allowUnverifiedLink });
  const auth = currentUser({ allowDevHeader: env.allowDevAuth ?? env.nodeEnv !== 'production', devUserId });

  return {
    services,
    sesion: makeSesionFirebase({ verifier, identificarUsuarioFirebase: services.identificarUsuarioFirebase }),
    router: makeCuentaRouter(makeCuentaController(services), auth),
  };
}

module.exports = { createUsuariosModule };
