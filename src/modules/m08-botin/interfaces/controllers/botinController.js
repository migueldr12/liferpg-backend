const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const v = require('../validators/botinValidators');

// Traduce cada petición HTTP a una llamada al servicio del RDF correspondiente.
function createBotinController(services) {
  return {
    friends: asyncHandler(async (req, res) => {
      res.json(await services.consultarAmigos(req.user.id));
    }),

    // RDF088
    chest: asyncHandler(async (req, res) => {
      res.json(await services.consultarCofre(req.user.id));
    }),

    // Parte de RDF083
    friendChest: asyncHandler(async (req, res) => {
      res.json(await services.consultarCofreAmigo(req.user.id, v.parseId(req.params.friendId, 'No encontramos a ese amigo.')));
    }),

    // RDF082 · RDF089 · RDF090
    sendGift: asyncHandler(async (req, res) => {
      res.status(201).json(await services.enviarRegalo(req.user.id, v.parseGift(req.body)));
    }),

    // RDF084
    requests: asyncHandler(async (req, res) => {
      res.json(await services.consultarSolicitudes(req.user.id));
    }),

    // RDF083
    createRequest: asyncHandler(async (req, res) => {
      res.status(201).json(await services.solicitarRegalo(req.user.id, v.parseRequest(req.body)));
    }),

    // RDF085
    answerRequest: asyncHandler(async (req, res) => {
      const requestId = v.parseId(req.params.requestId, 'No encontramos esa solicitud.');
      res.json(await services.responderSolicitud(req.user.id, requestId, v.parseAnswer(req.body)));
    }),

    // RDF086 · RDF087
    history: asyncHandler(async (req, res) => {
      res.json(await services.consultarHistorial(req.user.id, v.parseHistoryQuery(req.query)));
    }),
  };
}

module.exports = { createBotinController };
