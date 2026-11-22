const { unauthorized } = require('../errors/AppError');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Identifica al usuario de la petición en req.user.
// TEMPORAL hasta que el M00 agregue el login con JWT: el middleware de autenticación
// llenará req.user y este dejará de usar el encabezado. Mientras tanto, fuera de
// producción se acepta el encabezado X-User-Id (o DEV_USER_ID del .env) para probar.
function currentUser({ allowDevHeader, devUserId }) {
  return (req, res, next) => {
    if (req.user?.id) return next();
    if (allowDevHeader) {
      const id = req.get('X-User-Id') || devUserId;
      if (id && OBJECT_ID.test(id)) {
        req.user = { id };
        return next();
      }
    }
    return next(unauthorized());
  };
}

module.exports = { currentUser };
