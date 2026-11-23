const { EconomyRepository } = require('../../domain/repositories/EconomyRepository');
const { toEconomyVersion, economyVersionData } = require('../mappers/economiaMapper');

// Economía versionada en MongoDB (economy_versions). "version" es única: cada
// publicación inserta un documento nuevo y nunca se modifica uno anterior.

class PrismaEconomyRepository extends EconomyRepository {
  /** @param {{ db: import('@prisma/client').PrismaClient | (() => import('@prisma/client').PrismaClient) }} options */
  constructor({ db }) {
    super();
    this.cliente = typeof db === 'function' ? db : () => db;
  }

  /** @returns {import('@prisma/client').PrismaClient} */
  get db() {
    return this.cliente();
  }

  async findLatest() {
    const row = await this.db.economyVersion.findFirst({ orderBy: { version: 'desc' } });
    return row ? toEconomyVersion(row) : null;
  }

  async create(version) {
    const row = await this.db.economyVersion.create({ data: economyVersionData(version) });
    return toEconomyVersion(row);
  }
}

module.exports = { PrismaEconomyRepository };
