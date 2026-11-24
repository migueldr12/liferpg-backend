const { Router } = require('express');
const { createBotinController } = require('../controllers/botinController');

// Rutas del M08 (Botín · regalos entre amigos · PWA Perfil lite), montadas en /api/v1/botin.
// Los endpoints son los que anota src/modules/m08-botin/api/botinApi.js de la PWA.
function createBotinRouter({ services, auth }) {
  const c = createBotinController(services);
  const router = Router();
  router.use(auth);

  router.get('/amigos', c.friends);
  router.get('/cofre', c.chest); // RDF088
  router.get('/cofre/:friendId', c.friendChest); // RDF083 (cofre del amigo)
  router.post('/regalos', c.sendGift); // RDF082 · RDF089 · RDF090
  router.get('/solicitudes', c.requests); // RDF084
  router.post('/solicitudes', c.createRequest); // RDF083
  router.post('/solicitudes/:requestId', c.answerRequest); // RDF085
  router.get('/historial', c.history); // RDF086 · RDF087

  return router;
}

module.exports = { createBotinRouter };
