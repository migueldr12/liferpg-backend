const { unauthorized } = require('../errors/AppError');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Id del usuario de la petición.
// Con login (M00): el middleware sesionFirebase valida "Authorization: Bearer <token>" y llena
// req.user antes de llegar aquí. Sin token, solo fuera de producción:
// - x-user-id con un id de MongoDB (24 caracteres) se usa tal cual.
// - Cualquier otro x-user-id (la app manda "u-1" en sus modos de prueba) o ninguno se
//   traduce al usuario de prueba de DEV_USER_ID, así los datos simulados de la app siguen
//   funcionando con "u-1" y lo que va a la API cae en un usuario real de la base.
// En producción, sin token válido: 401.
// Lanza el error; la usan también los controladores que no montan el middleware (M02).
function userIdFromRequest(req, { allowDevHeader, devUserId }) {
  // Traía un token de Firebase que no se pudo validar (M00 · sesionFirebase): 401
  if (req.authError) throw req.authError;
  if (req.user?.id) return req.user.id;
  if (allowDevHeader) {
    const header = typeof req.get === 'function' ? req.get('x-user-id') : req.headers?.['x-user-id'];
    if (header && OBJECT_ID.test(header)) return header;
    if (devUserId && OBJECT_ID.test(devUserId)) return devUserId;
    if (header) {
      throw unauthorized('Configura DEV_USER_ID en el .env del backend con el id de MongoDB del usuario de prueba.');
    }
  }
  throw unauthorized();
}

// Middleware: deja el usuario en req.user.
function currentUser(options) {
  return (req, res, next) => {
    try {
      const id = userIdFromRequest(req, options);
      if (!req.user?.id) req.user = { id };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { currentUser, userIdFromRequest };
