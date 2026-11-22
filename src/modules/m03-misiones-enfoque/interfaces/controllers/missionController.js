const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const v = require('../validators/missionValidators');

// Traduce cada petición HTTP a una llamada al servicio del RDF correspondiente.
function createMissionController(services) {
  return {
    // RDF035 / RDF036
    listActive: asyncHandler(async (req, res) => {
      res.json(await services.consultarMisionesActivas(req.user.id, v.parseActiveQuery(req.query)));
    }),

    getOne: asyncHandler(async (req, res) => {
      res.json(await services.consultarMision(req.user.id, v.parseId(req.params.missionId, 'missionId')));
    }),

    // RDF037
    create: asyncHandler(async (req, res) => {
      res.status(201).json(await services.agregarMision(req.user.id, v.parseCreateMission(req.body)));
    }),

    // RDF038
    previewReward: asyncHandler(async (req, res) => {
      res.json(await services.calcularRecompensaMision(v.parseRewardQuery(req.query)));
    }),

    // RDF044
    history: asyncHandler(async (req, res) => {
      res.json(await services.consultarHistorialMisiones(req.user.id, v.parseHistoryQuery(req.query)));
    }),

    // RDF039
    startSession: asyncHandler(async (req, res) => {
      const missionId = v.parseId(req.params.missionId, 'missionId');
      res.status(201).json(await services.iniciarSesionEnfoque(req.user.id, missionId));
    }),

    // RDF040 · responde 204 sin cuerpo
    failSession: asyncHandler(async (req, res) => {
      const sessionId = v.parseId(req.params.sessionId, 'sessionId');
      await services.rendirseSesion(req.user.id, sessionId, v.parseAbandon(req.body));
      res.sendStatus(204);
    }),

    // RDF041 · RDF042 · RDF043 (smartwatch)
    finishSession: asyncHandler(async (req, res) => {
      const sessionId = v.parseId(req.params.sessionId, 'sessionId');
      res.json(await services.finalizarSesionEnfoque(req.user.id, sessionId, v.parseFinish(req.body)));
    }),

    // RDF042
    sessionOutcome: asyncHandler(async (req, res) => {
      res.json(await services.consultarResultadoSesion(req.user.id, v.parseId(req.params.sessionId, 'sessionId')));
    }),

    // RDF043 (manual)
    confirmManual: asyncHandler(async (req, res) => {
      res.json(await services.validarMisionFisica(req.user.id, v.parseId(req.params.sessionId, 'sessionId')));
    }),
  };
}

module.exports = { createMissionController };
