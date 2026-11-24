const express = require('express');
const { validarCompra, validarRecompensa } = require('../validators/tiendaValidators');

// Routers del M04. Se montan en src/routes/index.js:
//   /api/v1/tienda      · escaparate, compras y recompensas personalizadas
//   /api/v1/inventario  · inventario, canjes, consumibles y ropa
// Todas las rutas piden usuario (currentUser).

function makeTiendaRouters(controller, { auth }) {
  const tienda = express.Router();
  tienda.use(auth);
  tienda.get('/articulos', controller.listarArticulos);
  tienda.post('/compras', validarCompra, controller.comprar);
  tienda.get('/precio-sugerido', controller.precioSugerido);
  tienda.post('/recompensas', validarRecompensa, controller.crearRecompensa);
  tienda.get('/recompensas/:id', controller.obtenerRecompensa);
  tienda.put('/recompensas/:id', validarRecompensa, controller.editarRecompensa);
  tienda.delete('/recompensas/:id', controller.borrarRecompensa);

  const inventario = express.Router();
  inventario.use(auth);
  inventario.get('/', controller.listarInventario);
  inventario.get('/canjes', controller.listarCanjes);
  inventario.post('/recompensas/:id/canjear', controller.canjearRecompensa);
  inventario.post('/consumibles/:id/usar', controller.usarConsumible);
  inventario.patch('/ropa/:id', controller.alternarRopa);

  return { tienda, inventario };
}

module.exports = { makeTiendaRouters };
