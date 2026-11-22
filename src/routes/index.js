const { Router } = require('express');
const { createHealthRouter } = require('./health');

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case:
//   router.use('/misiones', require('../modules/m03-misiones-enfoque/interfaces/routes'));
function createApiRouter(deps) {
  const router = Router();

  router.use('/health', createHealthRouter(deps));

  return router;
}

module.exports = { createApiRouter };
