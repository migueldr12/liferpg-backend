const { env } = require('../../config/env');
const { unauthorized } = require('../errors/AppError');

const OBJECT_ID = /^[0-9a-f]{24}$/i;

// PROVISIONAL hasta que M00 entregue el middleware JWT.
// Contrato: deja el usuario autenticado en req.user = { id }.
// Cuando exista el JWT, ese middleware llena req.user y este archivo se puede borrar
// (los módulos solo leen req.user.id). En desarrollo acepta el encabezado X-User-Id
// para probar con curl/Postman; en producción nunca lo acepta.
function requireUser(req, res, next) {
  if (req.user?.id) return next();
  if (env.nodeEnv !== 'production') {
    const id = req.get('x-user-id');
    if (id && OBJECT_ID.test(id)) {
      req.user = { id: id.toLowerCase() };
      return next();
    }
  }
  return next(unauthorized());
}

module.exports = { requireUser };
