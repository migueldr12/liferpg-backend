const { asyncHandler } = require('../../../../shared/utils/asyncHandler');

function makeAchievementController(services) {
  return {
    // RDF060 · GET /logros: incluye bloqueados y desbloqueados del usuario actual.
    list: asyncHandler(async (req, res) => {
      res.json(await services.consultarLogros(req.user.id));
    }),

    // RDF063 · GET /logros/:id: ficha del logro.
    detail: asyncHandler(async (req, res) => {
      res.json(await services.consultarDetalleLogro(req.user.id, req.params.id));
    }),

    // RDF064 · POST /logros/:id/reclamar: { achievement, wallet }.
    claim: asyncHandler(async (req, res) => {
      res.json(await services.reclamarRecompensaLogro(req.user.id, req.params.id));
    }),

    // RF018 · GET /progreso/comparativa: Tú vs. tú.
    comparison: asyncHandler(async (req, res) => {
      res.json(await services.consultarComparativaMensual(req.user.id));
    }),
  };
}

module.exports = { makeAchievementController };
