const { Router } = require('express');
const { createHealthRouter } = require('./health');
const { createM03Routers } = require('../modules/m03-misiones-enfoque/interfaces/routes');
const { createResumenProgresoRouter } = require('../modules/m11-resumen-progreso/interfaces/routes');

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case.
function createApiRouter(deps) {
  const router = Router();

  router.use(['/estado', '/health'], createHealthRouter(deps));

  // M03 · Misiones únicas y enfoque
  const m03 = createM03Routers({ missionRepository: deps.missionRepository, now: deps.now });
  router.use('/misiones', m03.misiones);
  router.use('/sesiones', m03.sesiones);


  
  router.use(['/estado', '/health'], createHealthRouter(deps));
  router.use('/resumen-progreso', createResumenProgresoRouter());

  return router;
}


module.exports = { createApiRouter };
