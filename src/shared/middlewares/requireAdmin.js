const { forbidden } = require('../errors/AppError');
const { getPrisma } = require('../infrastructure/database/prisma');

// Deja pasar solo a usuarios con rol ADMIN (users.role). Va después de currentUser,
// que ya dejó el id en req.user.id. Lo usan las secciones de la PWA Admin (M13, M14, M15).
//
// findRole(userId) → 'ADMIN' | 'PLAYER' | null. Por defecto lo consulta en MongoDB;
// las pruebas pasan otra función.
const roleFromDatabase = async (userId) =>
  (await getPrisma().user.findUnique({ where: { id: userId }, select: { role: true } }))?.role ?? null;

function requireAdmin({ findRole = roleFromDatabase } = {}) {
  return async (req, res, next) => {
    try {
      const role = await findRole(req.user.id);
      if (role !== 'ADMIN') return next(forbidden('Esta sección es solo para administradores.'));
      req.user.role = role;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireAdmin };
