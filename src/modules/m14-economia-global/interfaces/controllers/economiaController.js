const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { toEconomyDto, toCategoryDto, toItemDto, toCampaignDto } = require('../../application/dtos/economiaDtos');

// Controlador del M14: traduce req/res de Express a llamadas a los casos de uso.
// El administrador llega en req.user.id (currentUser + requireAdmin); los errores
// los responde errorHandler, por eso aquí no hay try/catch.

function makeEconomiaController(services) {
  return {
    // ───── 14.1 Curva de experiencia ─────
    curva: asyncHandler(async (req, res) => {
      res.json(toEconomyDto(await services.consultarEconomiaActiva()));
    }),

    publicar: asyncHandler(async (req, res) => {
      res.status(201).json(toEconomyDto(await services.publicarEconomia(req.user.id, req.body)));
    }),

    // ───── 14.2 Catálogo ─────
    listarCategorias: asyncHandler(async (req, res) => {
      res.json((await services.consultarCategorias()).map(toCategoryDto));
    }),

    crearCategoria: asyncHandler(async (req, res) => {
      res.status(201).json(toCategoryDto(await services.agregarCategoria(req.body)));
    }),

    editarCategoria: asyncHandler(async (req, res) => {
      res.json(toCategoryDto(await services.actualizarCategoria(req.params.id, req.body)));
    }),

    borrarCategoria: asyncHandler(async (req, res) => {
      await services.eliminarCategoria(req.params.id);
      res.status(204).end();
    }),

    listarArticulos: asyncHandler(async (req, res) => {
      res.json((await services.consultarArticulos()).map(toItemDto));
    }),

    crearArticulo: asyncHandler(async (req, res) => {
      res.status(201).json(toItemDto(await services.agregarArticulo(req.body)));
    }),

    editarArticulo: asyncHandler(async (req, res) => {
      res.json(toItemDto(await services.actualizarArticulo(req.params.id, req.body)));
    }),

    // ───── 14.3 Disparador push ─────
    audiencia: asyncHandler(async (req, res) => {
      res.json(await services.consultarAudiencia());
    }),

    historial: asyncHandler(async (req, res) => {
      res.json((await services.consultarHistorialEnvios()).map(toCampaignDto));
    }),

    enviar: asyncHandler(async (req, res) => {
      res.status(201).json(toCampaignDto(await services.enviarNotificacionPush(req.user.id, req.body)));
    }),
  };
}

module.exports = { makeEconomiaController };
