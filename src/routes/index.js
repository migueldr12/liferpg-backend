const { Router } = require('express');
const { createHealthRouter } = require('./health');

const m01Routes = require('../modules/m01-tamagotchi-perfil/interfaces/routes');
const m01Ctrl = require('../modules/m01-tamagotchi-perfil/interfaces/controllers/tamagotchiPerfil.controller');
const m02Routes = require('../modules/m02-habitos/interfaces/routes');

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case:
//   router.use('/misiones', require('../modules/m03-misiones-enfoque/interfaces/routes'));
function createApiRouter(deps) {
  const router = Router();

  router.use(['/estado', '/health'], createHealthRouter(deps));

  // URLs exactas que consume movil chillon
  router.use('/usuarios', m01Routes);
  router.get('/tamagotchi', m01Ctrl.getTamagotchi);
  router.use('/vestidor', m01Routes);
  router.use('/habitos', m02Routes);

  // alias del módulo pq si no movil llora
  router.use('/tamagotchi-perfil', m01Routes)

  return router;
}

module.exports = { createApiRouter };
