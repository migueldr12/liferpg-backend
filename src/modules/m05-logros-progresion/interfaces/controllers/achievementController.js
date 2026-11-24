const { asyncHandler } = require('../../../../shared/utils/asyncHandler');

function makeAchievementController(services) {
  return {
    // RDF060 · GET /logros: incluye bloqueados y desbloqueados del usuario actual.
    list: asyncHandler(async (req, res) => {
      res.json(await services.consultarLogros(req.user.id));
    }),
  };
}

module.exports = { makeAchievementController };
