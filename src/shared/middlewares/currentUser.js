const { unauthorized } = require('../errors/AppError');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Identifica al usuario de la petición en req.user.
// Con login (M00): el middleware sesionFirebase valida "Authorization: Bearer <token>" y llena
// req.user antes de llegar aquí. Sin token, solo fuera de producción:
// - x-user-id con un id de MongoDB (24 caracteres) se usa tal cual.
// - Cualquier otro x-user-id (la app manda "u-1" en sus modos de prueba) o ninguno se
//   traduce al usuario de prueba de DEV_USER_ID, así los datos simulados de la app siguen
//   funcionando con "u-1" y lo que va a la API cae en un usuario real de la base.
function currentUser({ allowDevHeader, devUserId }) {
  return (req, res, next) => {
    // Traía un token de Firebase que no se pudo validar (M00 · sesionFirebase): 401
    if (req.authError) return next(req.authError);
    if (req.user?.id) return next();
    if (allowDevHeader) {
      const header = req.get('x-user-id');
      if (header && OBJECT_ID.test(header)) {
        req.user = { id: header };
        return next();
      }
      if (devUserId && OBJECT_ID.test(devUserId)) {
        req.user = { id: devUserId };
        return next();
      }
      if (header) {
        return next(unauthorized('Configura DEV_USER_ID en el .env del backend con el id de MongoDB del usuario de prueba.'));
      }
    }
    return next(unauthorized());
  };
}

module.exports = { currentUser };
