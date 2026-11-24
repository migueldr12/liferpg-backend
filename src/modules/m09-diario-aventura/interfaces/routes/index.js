const { Router } = require('express');
const { createDiaryController } = require('../controllers/diarioController');

// Rutas del M09 (Diario de aventura · PWA Perfil lite), montadas en /api/v1/diario.
// Los endpoints son los que anota src/modules/m09-diario-aventura/api/diarioApi.js de la PWA.
function createDiaryRouter({ services, auth }) {
  const c = createDiaryController(services);
  const router = Router();
  router.use(auth);

  router.get('/actividades', c.list); // RDF091 · RDF092
  router.get('/actividades/:activityId', c.detail); // RDF093
  router.post('/actividades/:activityId/notas', c.addNote); // RDF094
  router.put('/actividades/:activityId/notas/:noteId', c.updateNote); // RDF095
  router.delete('/actividades/:activityId/notas/:noteId', c.deleteNote); // RDF095
  router.get('/graficas/cumplimiento', c.completion); // RDF096
  router.get('/graficas/distribucion', c.distribution); // RDF097

  return router;
}

module.exports = { createDiaryRouter };
