const { Router } = require('express');
const { createHealthRouter } = require('./health');
const { createMisionesRouter } = require('../modules/m03-misiones-enfoque/interfaces/routes');

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case.
function createApiRouter(deps) {
  const router = Router();

  router.use('/health', createHealthRouter(deps));

  // M03 · Misiones únicas y enfoque
  router.use('/misiones', createMisionesRouter({ missionRepository: deps.missionRepository, now: deps.now }));

  return router;
}

module.exports = { createApiRouter };
