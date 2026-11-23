const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { validateAlertsQuery, validateRunBody } = require('../validators/m10Validators');

function createInactividadController({ consultarAvisos, ejecutarRevision, defaults }) {
  return {
    // GET /avisos-inactividad
    avisos: asyncHandler(async (req, res) => {
      const { items, total } = await consultarAvisos({ userId: req.user.id, ...validateAlertsQuery(req.query) });
      res.set('X-Total-Count', String(total));
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');
      res.json(items);
    }),

    // POST /inactividad/ejecutar  (solo ADMIN)
    ejecutar: asyncHandler(async (req, res) => {
      const options = validateRunBody(req.body);
      res.json(await ejecutarRevision({ thresholdDays: defaults.thresholdDays, lowRate: defaults.lowCompletionRate, ...options }));
    }),
  };
}

module.exports = { createInactividadController };
