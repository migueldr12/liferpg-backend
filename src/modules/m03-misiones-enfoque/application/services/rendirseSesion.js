const { conflict, notFound } = require('../../../../shared/errors/AppError');
const { SESSION_STATUS } = require('../../domain/entities/Mission');

// RDF040 · rendirseSesion (POST /sesiones/:id/fallar): por el botón "Rendirse" o porque la
// app detectó que el usuario salió durante el bloqueo. La misión queda fallida, sin puntos,
// y pasa al historial. Según el contrato responde 204 sin cuerpo.
function rendirseSesion({ missionRepository, now }) {
  return async (userId, sessionId, { reason }) => {
    const session = await missionRepository.findSession(userId, sessionId);
    if (!session) throw notFound('La sesión no existe.');
    if (session.status !== SESSION_STATUS.RUNNING) throw conflict('La sesión ya terminó.');

    await missionRepository.abandonSession({ sessionId, missionId: session.missionId, reason, at: now() });
  };
}

module.exports = { rendirseSesion };
