const express = require('express');
const v = require('../validators/cuentaValidators');

// Router del M00 montado en /api/v1/usuarios ANTES del router del M01, para que estas
// rutas de la cuenta las atienda el M00 y el resto de /usuarios/me/... siga en el M01.

function makeCuentaRouter(c, auth) {
  const router = express.Router();
  router.get('/me/cuenta', auth, c.ver); // 404 si aún no llena "Crear cuenta"
  router.post('/me/cuenta', auth, v.validarNuevaCuenta, c.crear); // RDF001
  router.put('/me/cuenta', auth, v.validarCambiosCuenta, c.editar); // RDF024, RDF026
  router.put('/me/mascota', auth, v.validarMascota, c.mascota); // Bienvenido a Life-RPG
  return router;
}

module.exports = { makeCuentaRouter };
