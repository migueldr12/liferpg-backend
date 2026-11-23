const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { unauthorized, forbidden } = require('../../../../shared/errors/AppError');
const { env } = require('../../../../config/env');
const { isObjectId } = require('../validators/m10Validators');

// ⚠️ TEMPORAL hasta que M00 entregue el JWT (RDF006/RDF010).
// Mientras tanto identifica al usuario con el encabezado `X-User-Id: <id de usuario>` para poder
// probar en Postman. Se desactiva solo cuando NODE_ENV=production.
// Para cambiarlo por el JWT real basta con reemplazar este middleware: el resto de M10
// solo lee `req.user = { id, role, displayName }`.
function createAuthenticate({ users, allowDevAuth = env.nodeEnv !== 'production' }) {
  return asyncHandler(async (req, res, next) => {
    const id = req.get('x-user-id');
    if (!allowDevAuth || !id) throw unauthorized();
    if (!isObjectId(id)) throw unauthorized('El X-User-Id no es válido.');

    const user = await users.findAuthUser(id);
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) throw unauthorized('La cuenta no existe o está desactivada.');

    req.user = { id: user.id, role: user.role, displayName: user.displayName };
    next();
  });
}

const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(forbidden());

module.exports = { createAuthenticate, requireRole };
