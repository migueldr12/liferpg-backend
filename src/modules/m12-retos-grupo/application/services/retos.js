const { GroupChallenge, AREAS } = require('../../domain/entities/GroupChallenge');
const { actividadesDelReto, cumplimientoPorArea, promedioGrupo, puntosPorArea } = require('../../domain/calculos');
const { NotFoundError, ValidationError } = require('../../domain/errors');
const { toDateKey, dateKeyToUtc, addDays, inicioDelDia, lunesDe } = require('../../../../shared/utils/zonaHoraria');

// Casos de uso del M12 (Retos y métricas de grupo · PWA Perfil lite).
// deps: socialRepository, challengeRepository, activityRepository, clock, timeZone.

const DIAS_POR_PERIODO = { semana: 7, mes: 30 };

function makeRetosServices({ socialRepository, challengeRepository, activityRepository, clock, timeZone }) {
  const hoy = () => toDateKey(clock(), timeZone);

  // RDF119 · registrarAportacionReto: suma al reto cada actividad válida de cada participante
  // desde que se unió y hasta el fin del día límite. Es idempotente: cada actividad se guarda
  // una sola vez (índice único), así se puede llamar cada vez que se consulta el reto.
  // RDF121 · otorgarRecompensaReto: al llegar a la meta se completa y se entrega la recompensa.
  async function sincronizar(challenge, rewardItem) {
    if (challenge.status !== 'activo') return challenge;
    const ahora = clock();
    const finDelReto = inicioDelDia(addDays(challenge.deadline, 1), timeZone);
    const to = ahora < finDelReto ? ahora : finDelReto;
    const yaContadas = await challengeRepository.findContributionKeys(challenge.id);

    for (const p of challenge.participants) {
      const from = new Date(Math.max(new Date(challenge.createdAt).getTime(), new Date(p.joinedAt).getTime()));
      if (from >= to) continue;
      const actividad = await activityRepository.findActivity([p.userId], { from, to });
      const reto = { metric: challenge.metric, area: challenge.type };
      const nuevas = actividadesDelReto(reto, actividad, p.userId).filter((a) => !yaContadas.has(`${a.activityType}|${a.activityId}`));
      await challengeRepository.addContributions(challenge.id, p.userId, nuevas);
    }

    let updated = await challengeRepository.saveProgress(challenge);
    if (updated.total >= updated.goal) {
      await challengeRepository.completeAndReward(updated.id, updated.participants.map((p) => p.userId), rewardItem?.id ?? null);
      updated = await challengeRepository.findById(updated.id);
    }
    return updated;
  }

  const conRecompensa = (challenge, rewardItem) => Object.assign(challenge, { reward: rewardItem?.name ?? null });

  // Personas (nombre, avatar, color) de todos los participantes de varios retos
  async function personasDe(challenges, extra = []) {
    const ids = new Set(extra);
    for (const c of challenges) for (const p of c.participants) ids.add(p.userId);
    return new Map((await socialRepository.findPeople([...ids])).map((p) => [p.id, p]));
  }

  // Amigos para invitar (RDF117)
  async function consultarAmigos(userId) {
    return socialRepository.findPeople(await socialRepository.findFriendIds(userId));
  }

  // RDF120 · consultarProgresoReto: retos activos del usuario con su progreso al día
  async function consultarRetos(userId) {
    const rewardItem = await challengeRepository.findRewardItem();
    const list = await challengeRepository.findActiveForUser(userId, dateKeyToUtc(hoy()));
    const synced = [];
    for (const c of list) synced.push(conRecompensa(await sincronizar(c, rewardItem), rewardItem));
    return { challenges: synced, people: await personasDe(synced) };
  }

  // RDF117 · agregarRetoGrupal: el creador participa desde ya; los invitados al aceptar
  async function agregarRetoGrupal(userId, { title, type, metric, goal, deadline, invited }) {
    const challenge = new GroupChallenge({ title, type, metric, goal, deadline, creatorId: userId, createdAt: clock().toISOString() });
    GroupChallenge.validarFechaLimite(challenge.deadline, hoy(), addDays);
    const friendIds = new Set(await socialRepository.findFriendIds(userId));
    const invitedIds = GroupChallenge.validarInvitados(invited, friendIds);

    const saved = conRecompensa(await challengeRepository.createChallenge(challenge, invitedIds), await challengeRepository.findRewardItem());
    return { challenge: saved, people: await personasDe([saved]) };
  }

  // RDF118 · invitaciones pendientes (de retos que no han vencido)
  async function consultarInvitaciones(userId) {
    const rewardItem = await challengeRepository.findRewardItem();
    const invitations = await challengeRepository.findInvitations(userId, dateKeyToUtc(hoy()));
    invitations.forEach((i) => conRecompensa(i.challenge, rewardItem));
    const challenges = invitations.map((i) => i.challenge);
    return { invitations, people: await personasDe(challenges, challenges.map((c) => c.creatorId)) };
  }

  // RDF118 · unirseARetoGrupal: aceptar (devuelve el reto) o rechazar (null)
  async function responderInvitacion(userId, invitationId, accept) {
    const invitation = await challengeRepository.findInvitationById(userId, invitationId);
    if (!invitation || invitation.challenge.status !== 'activo' || invitation.challenge.deadline < hoy()) {
      throw new NotFoundError('La invitación ya no existe.');
    }
    await challengeRepository.answerInvitation(invitation.id, accept, clock());
    if (!accept) return null;
    const rewardItem = await challengeRepository.findRewardItem();
    const joined = conRecompensa(await sincronizar(await challengeRepository.findById(invitation.challenge.id), rewardItem), rewardItem);
    return { challenge: joined, people: await personasDe([joined]) };
  }

  // RDF122 · calcularPromedioGrupo y RDF123 · mostrarMetricasGrupo:
  // tu cumplimiento por área frente al promedio de tus amigos (últimos 7 o 30 días)
  async function consultarMetricasGrupo(userId, period) {
    const days = DIAS_POR_PERIODO[period];
    if (!days) throw new ValidationError('El periodo debe ser "semana" o "mes".');
    const to = clock();
    const from = inicioDelDia(addDays(hoy(), -(days - 1)), timeZone);
    const friendIds = await socialRepository.findFriendIds(userId);
    const actividad = await activityRepository.findActivity([userId, ...friendIds], { from, to });

    const mio = cumplimientoPorArea(userId, actividad, from, to);
    const grupo = promedioGrupo(friendIds.map((id) => cumplimientoPorArea(id, actividad, from, to)));
    const byType = Object.fromEntries(AREAS.map((a) => [a, { me: mio[a], group: grupo[a] }]));
    return { period, friendsCount: friendIds.length, byType };
  }

  // RDF124 · calcularAvanceSemanalPorArea y RDF125 · filtrarAmigosPorArea:
  // puntos ganados desde el lunes en el área elegida, de mayor a menor (tú incluido)
  async function consultarActividadSemanal(userId, area) {
    if (!AREAS.includes(area)) throw new ValidationError('El área debe ser cultura, fisico o enfoque.');
    const friendIds = await socialRepository.findFriendIds(userId);
    const ids = [userId, ...friendIds];
    const from = inicioDelDia(lunesDe(hoy()), timeZone);
    const puntos = puntosPorArea(ids, await activityRepository.findActivity(ids, { from, to: clock() }));
    const people = await socialRepository.findPeople(ids);

    return people
      .map((p) => ({ ...p, points: puntos.get(p.id)?.[area] ?? 0, isMe: p.id === userId }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'es'))
      .map((p, i) => ({ ...p, position: i + 1 }));
  }

  return {
    consultarAmigos,
    consultarRetos,
    agregarRetoGrupal,
    consultarInvitaciones,
    responderInvitacion,
    consultarMetricasGrupo,
    consultarActividadSemanal,
  };
}

module.exports = { makeRetosServices, DIAS_POR_PERIODO };
