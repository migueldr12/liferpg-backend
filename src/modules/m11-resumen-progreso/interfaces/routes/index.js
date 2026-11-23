const { Router } = require('express');
const { requireUser } = require('../../../../shared/middlewares/requireUser');
const { createProgressRepository } = require('../../infrastructure/repositories/progressRepository');
const { createResumenProgresoService } = require('../../application/services/resumenProgresoService');
const { createResumenProgresoController } = require('../controllers/resumenProgresoController');

// Desfase horario por defecto (minutos, como Date.getTimezoneOffset): 360 = UTC-6, Guanajuato.
// El cliente puede mandar ?utcOffset= para sobrescribirlo.
function defaultUtcOffset() {
  const n = Number(process.env.DEFAULT_UTC_OFFSET_MIN);
  return process.env.DEFAULT_UTC_OFFSET_MIN && Number.isInteger(n) ? n : 360;
}

// Se monta en /api/v1/resumen-progreso. Las pruebas pueden inyectar `service` y `auth`.
function createResumenProgresoRouter({ service, auth = requireUser } = {}) {
  const resolved = service ?? createResumenProgresoService({
    repo: createProgressRepository(),
    defaultUtcOffset: defaultUtcOffset(),
  });
  const controller = createResumenProgresoController(resolved);
  const router = Router();

  router.use(auth);
  router.get('/pendientes', controller.pendientes);                      // RDF111, RDF112 (un día)
  router.get('/pendientes/historial', controller.pendientesHistorial);   // RDF112 (varios días)
  router.get('/cumplimiento', controller.cumplimiento);                  // RDF113
  router.get('/dias-baja-actividad', controller.diasBajaActividad);      // RDF114
  router.get('/racha', controller.racha);                                // RDF115
  router.get('/consistencia', controller.consistencia);                  // RDF116

  return router;
}

module.exports = { createResumenProgresoRouter };
