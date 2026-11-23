const { EconomyVersion } = require('../../domain/entities/EconomyVersion');
const { CatalogCategory } = require('../../domain/entities/CatalogCategory');
const { CatalogItem } = require('../../domain/entities/CatalogItem');
const { PushCampaign } = require('../../domain/entities/PushCampaign');

// Conversión documento de MongoDB ↔ entidad del M14.
// En la base se usan los enums del esquema (en inglés); en la API, los valores de la PWA.

const DIFFICULTY_TO_DB = { facil: 'EASY', media: 'MEDIUM', dificil: 'HARD', epica: 'EPIC' };
const CATEGORY_TYPE_TO_DB = { habitos: 'HABIT', misiones: 'MISSION', tienda: 'STORE', stickers: 'STICKER' };
const CAMPAIGN_STATUS_TO_DB = { en_cola: 'QUEUED', entregado: 'SENT', fallido: 'FAILED' };

const invert = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
const DIFFICULTY_FROM_DB = invert(DIFFICULTY_TO_DB);
const CATEGORY_TYPE_FROM_DB = invert(CATEGORY_TYPE_TO_DB);
const CAMPAIGN_STATUS_FROM_DB = invert(CAMPAIGN_STATUS_TO_DB);

const mapKeys = (obj, map) => Object.fromEntries(Object.entries(obj ?? {}).map(([k, v]) => [map[k] ?? k, v]));

const toEconomyVersion = (row) =>
  new EconomyVersion({
    id: row.id,
    version: row.version,
    base: row.base,
    exponent: row.exponent,
    difficultyPoints: mapKeys(row.difficultyPoints, DIFFICULTY_FROM_DB),
    rewardPrice: { min: row.rewardPriceMin, max: row.rewardPriceMax },
    publishedAt: row.publishedAt.toISOString(),
    publishedById: row.publishedById ?? null,
  });

const economyVersionData = (v) => ({
  version: v.version,
  base: v.base,
  exponent: v.exponent,
  difficultyPoints: mapKeys(v.difficultyPoints, DIFFICULTY_TO_DB),
  rewardPriceMin: v.rewardPrice.min,
  rewardPriceMax: v.rewardPrice.max,
  publishedById: v.publishedById,
  publishedAt: new Date(v.publishedAt),
});

const toCatalogCategory = (row, inUse = 0) =>
  new CatalogCategory({ id: row.id, name: row.name, type: CATEGORY_TYPE_FROM_DB[row.type], icon: row.icon ?? '🏷️', inUse });

const toCatalogItem = (row) =>
  new CatalogItem({
    id: row.id,
    name: row.name,
    group: row.group,
    icon: row.icon,
    price: row.price,
    tags: row.tags ?? [],
    active: row.active,
  });

const toPushCampaign = (row, username = null) =>
  new PushCampaign({
    id: row.id,
    title: row.title,
    message: row.message,
    target: row.targetKind === 'usuario' ? { kind: 'usuario', username: username ?? 'usuario' } : { kind: 'todos' },
    recipients: row.recipientCount,
    status: CAMPAIGN_STATUS_FROM_DB[row.status],
    deliveredPct: row.deliveredPct ?? null,
    sentAt: (row.sentAt ?? row.createdAt).toISOString(),
    createdAt: row.createdAt.toISOString(),
  });

module.exports = {
  DIFFICULTY_TO_DB,
  CATEGORY_TYPE_TO_DB,
  CAMPAIGN_STATUS_TO_DB,
  toEconomyVersion,
  economyVersionData,
  toCatalogCategory,
  toCatalogItem,
  toPushCampaign,
};
