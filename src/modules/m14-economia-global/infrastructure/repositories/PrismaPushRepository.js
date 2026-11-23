const { PushRepository } = require('../../domain/repositories/EconomyRepository');
const { CAMPAIGN_STATUS_TO_DB, toPushCampaign } = require('../mappers/economiaMapper');

// Avisos push en MongoDB: push_campaigns (historial), devices (tokens FCM),
// users (audiencia) y player_profiles (el alias es el "usuario" que escribe el admin).

const HISTORIAL_MAX = 100;

class PrismaPushRepository extends PushRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  // Jugadores activos (no cuenta administradores ni cuentas deshabilitadas)
  async countAudience() {
    return this.db.user.count({ where: { role: 'PLAYER', status: 'ACTIVE' } });
  }

  async findPlayerByUsername(username) {
    const profile = await this.db.playerProfile.findFirst({
      where: { alias: { equals: username, mode: 'insensitive' } },
      select: { userId: true, alias: true },
    });
    return profile ? { userId: profile.userId, username: profile.alias } : null;
  }

  async findDeviceTokens(target) {
    const rows = await this.db.device.findMany({
      where: { active: true, ...(target.kind === 'usuario' && { userId: target.userId }) },
      select: { fcmToken: true },
    });
    return rows.map((r) => r.fcmToken);
  }

  async deactivateTokens(tokens) {
    await this.db.device.updateMany({ where: { fcmToken: { in: tokens } }, data: { active: false } });
  }

  async findRecentDuplicate({ title, target, since }) {
    const row = await this.db.pushCampaign.findFirst({
      where: {
        title: { equals: title, mode: 'insensitive' },
        targetKind: target.kind,
        ...(target.kind === 'usuario' && { targetUserId: target.userId }),
        createdAt: { gte: since },
      },
    });
    return row ? toPushCampaign(row, target.username) : null;
  }

  async saveCampaign(campaign, { sentById, targetUserId = null }) {
    const row = await this.db.pushCampaign.create({
      data: {
        sentById,
        targetUserId,
        title: campaign.title,
        message: campaign.message,
        targetKind: campaign.target.kind,
        recipientCount: campaign.recipients,
        status: CAMPAIGN_STATUS_TO_DB[campaign.status],
        deliveredPct: campaign.deliveredPct,
        sentAt: campaign.status === 'en_cola' ? null : new Date(campaign.sentAt),
        createdAt: new Date(campaign.sentAt),
      },
    });
    return toPushCampaign(row, campaign.target.username ?? null);
  }

  async listCampaigns() {
    // Desempate por id: los ObjectId crecen con el tiempo
    const rows = await this.db.pushCampaign.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: HISTORIAL_MAX });
    const ids = [...new Set(rows.map((r) => r.targetUserId).filter(Boolean))];
    const profiles = ids.length
      ? await this.db.playerProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, alias: true } })
      : [];
    const alias = new Map(profiles.map((p) => [p.userId, p.alias]));
    return rows.map((row) => toPushCampaign(row, alias.get(row.targetUserId) ?? null));
  }
}

module.exports = { PrismaPushRepository };
