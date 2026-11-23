const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { persona, toChallengeDto, toInvitationDto, toRankingDto } = require('../../application/dtos/retosDtos');

// Controlador del M12: traduce req/res de Express a llamadas a los casos de uso.
// El usuario llega en req.user.id (currentUser); los errores los responde errorHandler.

function makeRetosController(services) {
  return {
    amigos: asyncHandler(async (req, res) => {
      res.json((await services.consultarAmigos(req.user.id)).map(persona));
    }),

    listar: asyncHandler(async (req, res) => {
      const { challenges, people } = await services.consultarRetos(req.user.id);
      res.json(challenges.map((c) => toChallengeDto(c, people)));
    }),

    crear: asyncHandler(async (req, res) => {
      const { challenge, people } = await services.agregarRetoGrupal(req.user.id, req.body);
      res.status(201).json(toChallengeDto(challenge, people));
    }),

    invitaciones: asyncHandler(async (req, res) => {
      const { invitations, people } = await services.consultarInvitaciones(req.user.id);
      res.json(invitations.map((i) => toInvitationDto(i, people)));
    }),

    // Aceptar → 200 con el reto; rechazar → 204 sin cuerpo
    responder: asyncHandler(async (req, res) => {
      const result = await services.responderInvitacion(req.user.id, req.params.id, req.body.accept);
      if (!result) return res.status(204).end();
      return res.json(toChallengeDto(result.challenge, result.people));
    }),

    metricas: asyncHandler(async (req, res) => {
      res.json(await services.consultarMetricasGrupo(req.user.id, req.query.periodo));
    }),

    actividad: asyncHandler(async (req, res) => {
      res.json((await services.consultarActividadSemanal(req.user.id, req.query.area)).map(toRankingDto));
    }),
  };
}

module.exports = { makeRetosController };
