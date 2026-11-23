const express = require('express');
const v = require('../validators/moodValidators');

// Router del M06. Se monta en /api/v1/animo (ver src/routes/index.js).
// Todas las rutas piden usuario (auth = middleware currentUser).
// Cada ruta: validador (forma de la petición) → acción del controlador.

function makeMoodRouter(controller, auth) {
  const router = express.Router();
  router.use(auth);

  // RF019 · Registro rápido
  router.post('/', v.validarRegistroAnimo, controller.registrar); // RDF068, RDF069
  router.get('/hoy', controller.hoy); // RDF017 (burbuja de la Casa)
  router.get('/recordatorio', controller.verRecordatorio); // RDF070
  router.put('/recordatorio', v.validarRecordatorio, controller.cambiarRecordatorio); // RDF070

  // RF020 · Gráfica de ánimo
  router.get('/tendencia', v.validarPeriodo, controller.tendencia); // RDF072 a RDF074

  // RF021 · Diario rápido
  router.get('/diario', controller.listarDiario); // RDF077
  router.post('/diario', v.validarNuevaEntrada, controller.crearEntrada); // RDF075
  router.put('/diario/:id', v.validarCambiosEntrada, controller.editarEntrada); // RDF076, RDF078
  router.delete('/diario/:id', controller.borrarEntrada); // RDF078

  return router;
}

module.exports = { makeMoodRouter };
