const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const v = require('../validators/diarioValidators');

// Traduce cada petición HTTP a una llamada al servicio del RDF correspondiente.
function createDiaryController(services) {
  return {
    // RDF091 · RDF092
    list: asyncHandler(async (req, res) => {
      res.json(await services.consultarActividades(req.user.id, v.parseListQuery(req.query)));
    }),

    // RDF093
    detail: asyncHandler(async (req, res) => {
      res.json(await services.consultarDetalleActividad(req.user.id, v.parseActivityParam(req.params.activityId)));
    }),

    // RDF094
    addNote: asyncHandler(async (req, res) => {
      const activityId = v.parseActivityParam(req.params.activityId);
      res.status(201).json(await services.agregarNotaSeguimiento(req.user.id, activityId, v.parseNoteBody(req.body)));
    }),

    // RDF095
    updateNote: asyncHandler(async (req, res) => {
      const activityId = v.parseActivityParam(req.params.activityId);
      const noteId = v.parseNoteId(req.params.noteId);
      const text = v.parseNoteBody(req.body, { editing: true });
      res.json(await services.actualizarNotaSeguimiento(req.user.id, activityId, noteId, text));
    }),

    // RDF095 · responde 204 sin cuerpo
    deleteNote: asyncHandler(async (req, res) => {
      const activityId = v.parseActivityParam(req.params.activityId);
      await services.eliminarNotaSeguimiento(req.user.id, activityId, v.parseNoteId(req.params.noteId));
      res.sendStatus(204);
    }),

    // RDF096
    completion: asyncHandler(async (req, res) => {
      res.json(await services.consultarCumplimientoPorPeriodo(req.user.id, v.parseRange(req.query)));
    }),

    // RDF097
    distribution: asyncHandler(async (req, res) => {
      res.json(await services.consultarDistribucionPorTipo(req.user.id, v.parseRange(req.query)));
    }),
  };
}

module.exports = { createDiaryController };
