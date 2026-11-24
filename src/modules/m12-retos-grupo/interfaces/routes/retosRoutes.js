const express = require('express');
const v = require('../validators/retosValidators');

// Router del M12 (PWA Perfil lite). Se monta en /api/v1/retos (src/routes/index.js).
// Todas las rutas piden usuario (auth = currentUser).

function makeRetosRouter(c, auth) {
  const router = express.Router();
  router.use(auth);

  // RF037 · Tablero de retos grupales
  router.get('/', c.listar); // RDF119, RDF120, RDF121
  router.post('/', v.validarNuevoReto, c.crear); // RDF117
  router.get('/amigos', c.amigos); // amigos para invitar
  router.get('/invitaciones', c.invitaciones); // RDF118
  router.post('/invitaciones/:id', v.validarRespuesta, c.responder); // RDF118

  // RF038 · Métricas de grupo
  router.get('/metricas', v.validarPeriodo, c.metricas); // RDF122, RDF123

  // RF039 · Filtros de actividad grupal
  router.get('/actividad', v.validarArea, c.actividad); // RDF124, RDF125

  return router;
}

module.exports = { makeRetosRouter };
