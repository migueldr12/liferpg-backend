const { unauthorized } = require('../errors/AppError');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Identifica al usuario de la petición en req.user.
// TEMPORAL hasta que el M00 valide el token de Firebase (Authorization: Bearer …, ver
// docs/API.md del móvil) y llene req.user. Mientras tanto, fuera de producción se acepta
// el encabezado x-user-id (o DEV_USER_ID del .env). Debe ser el id de MongoDB de un usuario
// real: en el .env del móvil, EXPO_PUBLIC_DEV_USER_ID tiene que ser ese mismo id.
function currentUser({ allowDevHeader, devUserId }) {
  return (req, res, next) => {
    if (req.user?.id) return next();
    if (allowDevHeader) {
      const id = req.get('x-user-id') || devUserId;
      if (id && OBJECT_ID.test(id)) {
        req.user = { id };
        return next();
      }
      if (id) return next(unauthorized('El usuario de prueba (x-user-id) debe ser el id de MongoDB de un usuario, de 24 caracteres.'));
    }
    return next(unauthorized());
  };
}

module.exports = { currentUser };
