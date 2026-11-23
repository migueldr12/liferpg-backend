const { ChallengeRepository } = require('../../domain/repositories/RetosRepository');
const { GroupChallenge } = require('../../domain/entities/GroupChallenge');
const { AREA_TO_DB, AREA_FROM_DB, METRIC_TO_DB, METRIC_FROM_DB, STATUS_FROM_DB } = require('../mappers/retosMapper');
const { dateKeyToUtc, utcToDateKey } = require('../../../../shared/utils/zonaHoraria');

// Retos en MongoDB: group_challenges, challenge_participants (invitaciones y aportación
// de cada quien) y challenge_contributions (cada actividad que sumó, sin duplicados por
// el índice único challengeId + activityType + activityId). La recompensa (RDF121) es un
// artículo del catálogo que se agrega al inventario de cada participante.

const OBJECT_ID = /^[a-f\d]{24}$/i;
const VISIBLES = ['ACTIVE', 'COMPLETED'];

class PrismaChallengeRepository extends ChallengeRepository {
  /**
   * rewardItemName: nombre del artículo del catálogo que se entrega al cumplir un reto.
   * @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient), rewardItemName?: string }} options
   */
  constructor({ db, rewardItemName = 'Cofre raro' }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
    this.rewardItemName = rewardItemName;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  async createChallenge(challenge, invitedIds) {
    const createdAt = new Date(challenge.createdAt);
    const id = await this.db.$transaction(async (tx) => {
      const row = await tx.groupChallenge.create({
        data: {
          creatorId: challenge.creatorId,
          title: challenge.title,
          area: AREA_TO_DB[challenge.type],
          metric: METRIC_TO_DB[challenge.metric],
          targetValue: challenge.goal,
          deadline: dateKeyToUtc(challenge.deadline),
          createdAt,
        },
      });
      await tx.challengeParticipant.createMany({
        data: [
          { challengeId: row.id, userId: challenge.creatorId, status: 'ACCEPTED', joinedAt: createdAt, createdAt },
          ...invitedIds.map((userId) => ({ challengeId: row.id, userId, status: 'INVITED', createdAt })),
        ],
      });
      return row.id;
    });
    return this.findById(id);
  }

  async findActiveForUser(userId, fromDeadline) {
    const mine = await this.db.challengeParticipant.findMany({
      where: { userId, status: 'ACCEPTED' },
      select: { challengeId: true },
    });
    const rows = await this.db.groupChallenge.findMany({
      where: { id: { in: mine.map((p) => p.challengeId) }, status: { in: VISIBLES }, deadline: { gte: fromDeadline } },
      orderBy: [{ deadline: 'asc' }, { id: 'asc' }],
    });
    return this.conParticipantes(rows);
  }

  async findById(challengeId) {
    if (!OBJECT_ID.test(challengeId ?? '')) return null;
    const row = await this.db.groupChallenge.findUnique({ where: { id: challengeId } });
    return row ? (await this.conParticipantes([row]))[0] : null;
  }

  async findInvitations(userId, fromDeadline) {
    const invites = await this.db.challengeParticipant.findMany({
      where: { userId, status: 'INVITED' },
      orderBy: { createdAt: 'desc' },
    });
    const rows = await this.db.groupChallenge.findMany({
      where: { id: { in: invites.map((i) => i.challengeId) }, status: 'ACTIVE', deadline: { gte: fromDeadline } },
    });
    const challenges = new Map((await this.conParticipantes(rows)).map((c) => [c.id, c]));
    return invites.filter((i) => challenges.has(i.challengeId)).map((i) => ({ id: i.id, challenge: challenges.get(i.challengeId) }));
  }

  async findInvitationById(userId, invitationId) {
    if (!OBJECT_ID.test(invitationId ?? '')) return null;
    const invite = await this.db.challengeParticipant.findFirst({ where: { id: invitationId, userId, status: 'INVITED' } });
    if (!invite) return null;
    const challenge = await this.findById(invite.challengeId);
    return challenge ? { id: invite.id, challenge } : null;
  }

  async answerInvitation(invitationId, accept, at) {
    await this.db.challengeParticipant.update({
      where: { id: invitationId },
      data: accept ? { status: 'ACCEPTED', joinedAt: at } : { status: 'DECLINED' },
    });
  }

  async findContributionKeys(challengeId) {
    const rows = await this.db.challengeContribution.findMany({
      where: { challengeId },
      select: { activityType: true, activityId: true },
    });
    return new Set(rows.map((r) => `${r.activityType}|${r.activityId}`));
  }

  async addContributions(challengeId, userId, activities) {
    if (!activities.length) return;
    try {
      await this.db.challengeContribution.createMany({
        data: activities.map((a) => ({ challengeId, userId, activityType: a.activityType, activityId: a.activityId, value: a.value })),
      });
    } catch (err) {
      // Otra petición ya las guardó al mismo tiempo: el índice único evita el doble conteo
      if (err.code !== 'P2002') throw err;
    }
  }

  // Recalcula la aportación de cada participante y el total a partir de challenge_contributions
  async saveProgress(challenge) {
    const rows = await this.db.challengeContribution.findMany({
      where: { challengeId: challenge.id },
      select: { userId: true, value: true },
    });
    const suma = new Map();
    for (const r of rows) suma.set(r.userId, (suma.get(r.userId) ?? 0) + r.value);

    const participants = await this.db.challengeParticipant.findMany({ where: { challengeId: challenge.id, status: 'ACCEPTED' } });
    const cambios = participants
      .filter((p) => p.contribution !== (suma.get(p.userId) ?? 0))
      .map((p) => this.db.challengeParticipant.update({ where: { id: p.id }, data: { contribution: suma.get(p.userId) ?? 0 } }));
    const total = [...suma.values()].reduce((a, b) => a + b, 0);
    await this.db.$transaction([
      ...cambios,
      this.db.groupChallenge.update({ where: { id: challenge.id }, data: { currentValue: total } }),
    ]);
    return this.findById(challenge.id);
  }

  // RDF121 · Marca el reto como completado y entrega la recompensa a cada participante.
  // Todo en una transacción; el cambio ACTIVE → COMPLETED es condicional, así la
  // recompensa se entrega una sola vez aunque dos peticiones lleguen juntas.
  async completeAndReward(challengeId, userIds, rewardItemId) {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.groupChallenge.updateMany({
        where: { id: challengeId, status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });
      if (!count || !rewardItemId) return count > 0;
      for (const userId of userIds) {
        await tx.inventoryEntry.upsert({
          where: { userId_catalogItemId: { userId, catalogItemId: rewardItemId } },
          create: { userId, catalogItemId: rewardItemId, quantity: 1, source: 'REWARD' },
          update: { quantity: { increment: 1 } },
        });
      }
      return true;
    });
  }

  async findRewardItem() {
    return this.db.catalogItem.findFirst({
      where: { name: this.rewardItemName, active: true, custom: false },
      select: { id: true, name: true },
    });
  }

  async conParticipantes(rows) {
    if (!rows.length) return [];
    const participants = await this.db.challengeParticipant.findMany({
      where: { challengeId: { in: rows.map((r) => r.id) }, status: { in: ['ACCEPTED', 'INVITED'] } },
    });
    return rows.map((row) => {
      const propios = participants.filter((p) => p.challengeId === row.id);
      const aceptados = propios.filter((p) => p.status === 'ACCEPTED');
      return new GroupChallenge({
        id: row.id,
        title: row.title,
        type: AREA_FROM_DB[row.area] ?? 'enfoque',
        metric: METRIC_FROM_DB[row.metric],
        goal: row.targetValue,
        deadline: utcToDateKey(row.deadline),
        creatorId: row.creatorId,
        createdAt: row.createdAt.toISOString(),
        status: STATUS_FROM_DB[row.status] ?? 'activo',
        total: row.currentValue ?? 0,
        participants: aceptados.map((p) => ({ userId: p.userId, amount: p.contribution ?? 0, joinedAt: (p.joinedAt ?? row.createdAt).toISOString() })),
        invitedCount: propios.length - aceptados.length,
      });
    });
  }
}

module.exports = { PrismaChallengeRepository };
