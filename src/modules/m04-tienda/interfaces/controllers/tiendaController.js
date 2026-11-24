const { asyncHandler } = require('../../../../shared/utils/asyncHandler');

// Controlador del M04: traduce req/res a llamadas de los casos de uso.
// El usuario llega en req.user.id (currentUser / sesionFirebase) y los errores
// los responde errorHandler con el formato del contrato.

function makeTiendaController(services) {
  return {
    // ───── 4.1 Escaparate ─────
    listarArticulos: asyncHandler(async (req, res) => {
      res.json(await services.consultarArticulos(req.user.id));
    }),

    comprar: asyncHandler(async (req, res) => {
      res.json(await services.comprarArticulo(req.user.id, req.body.itemId));
    }),

    precioSugerido: asyncHandler(async (req, res) => {
      res.json(await services.consultarPrecioSugerido(req.user.id));
    }),

    // ───── 4.2 Recompensa personalizada ─────
    crearRecompensa: asyncHandler(async (req, res) => {
      res.status(201).json(await services.crearRecompensa(req.user.id, req.body));
    }),

    obtenerRecompensa: asyncHandler(async (req, res) => {
      res.json(await services.consultarRecompensa(req.user.id, req.params.id));
    }),

    editarRecompensa: asyncHandler(async (req, res) => {
      res.json(await services.actualizarRecompensa(req.user.id, req.params.id, req.body));
    }),

    borrarRecompensa: asyncHandler(async (req, res) => {
      await services.eliminarRecompensa(req.user.id, req.params.id);
      res.status(204).end();
    }),

    // ───── 4.3 Inventario ─────
    listarInventario: asyncHandler(async (req, res) => {
      res.json(await services.consultarInventario(req.user.id));
    }),

    canjearRecompensa: asyncHandler(async (req, res) => {
      await services.canjearRecompensa(req.user.id, req.params.id);
      res.status(204).end();
    }),

    usarConsumible: asyncHandler(async (req, res) => {
      res.json(await services.usarConsumible(req.user.id, req.params.id));
    }),

    alternarRopa: asyncHandler(async (req, res) => {
      res.json(await services.alternarRopa(req.user.id, req.params.id));
    }),

    listarCanjes: asyncHandler(async (req, res) => {
      res.json(await services.consultarCanjes(req.user.id));
    }),
  };
}

module.exports = { makeTiendaController };
