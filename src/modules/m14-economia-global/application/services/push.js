const { PushCampaign } = require('../../domain/entities/PushCampaign');
const { ConflictError, NotFoundError } = require('../../domain/errors');

// 14.3 Disparador push (RF045).

const DIA_MS = 24 * 60 * 60 * 1000;

function makeConsultarAudiencia({ pushRepository }) {
  return async function consultarAudiencia() {
    return { total: await pushRepository.countAudience() };
  };
}

// RDF142 · consultarHistorialEnvios: más reciente primero
function makeConsultarHistorialEnvios({ pushRepository }) {
  return async function consultarHistorialEnvios() {
    return pushRepository.listCampaigns();
  };
}

// RDF141 · enviarNotificacionPush.
// 1. Valida título, mensaje y destino; el usuario se busca por su alias.
// 2. Evita duplicados: mismo título al mismo destino en las últimas 24 h → 409.
// 3. Siempre queda en el historial. Si el servidor tiene las llaves de Firebase
//    (pushSender.isConfigured()), se envía por FCM a los dispositivos registrados;
//    si no, queda "en_cola" para enviarse cuando se configuren.
function makeEnviarNotificacionPush({ pushRepository, pushSender, clock }) {
  return async function enviarNotificacionPush(adminId, { title, message, target }) {
    const draft = new PushCampaign({ title, message, target });

    let recipients;
    if (draft.target.kind === 'usuario') {
      const player = await pushRepository.findPlayerByUsername(draft.target.username);
      if (!player) throw new NotFoundError(`No existe el usuario @${draft.target.username}.`);
      draft.target = { kind: 'usuario', username: player.username, userId: player.userId };
      recipients = 1;
    } else {
      recipients = await pushRepository.countAudience();
    }

    const now = clock();
    const duplicate = await pushRepository.findRecentDuplicate({
      title: draft.title,
      target: draft.target,
      since: new Date(now.getTime() - DIA_MS),
    });
    if (duplicate) throw new ConflictError('Ya se envió un aviso con ese título a ese destino en las últimas 24 h.');

    let status = 'en_cola';
    let deliveredPct = null;
    if (pushSender.isConfigured()) {
      const tokens = await pushRepository.findDeviceTokens(draft.target);
      const result = await pushSender.send(tokens, { title: draft.title, body: draft.message });
      if (result.invalidTokens.length) await pushRepository.deactivateTokens(result.invalidTokens);
      deliveredPct = tokens.length ? Math.round((result.sent / tokens.length) * 100) : 0;
      status = result.sent > 0 ? 'entregado' : 'fallido';
    }

    const campaign = new PushCampaign({
      ...draft,
      recipients,
      status,
      deliveredPct,
      sentAt: now.toISOString(),
    });
    return pushRepository.saveCampaign(campaign, { sentById: adminId, targetUserId: draft.target.userId ?? null });
  };
}

module.exports = { makeConsultarAudiencia, makeConsultarHistorialEnvios, makeEnviarNotificacionPush };
