// DTOs de salida del M14: la forma exacta en la que responde la API
// (la que ya usa la PWA en src/modules/m14-economia-global/api/economiaApi.js).

const toEconomyDto = (v) => ({
  version: v.version,
  base: v.base,
  exponent: v.exponent,
  difficultyPoints: { ...v.difficultyPoints },
  rewardPrice: { ...v.rewardPrice },
  publishedAt: v.publishedAt,
  curve: v.curve(), // RDF134: XP por nivel, 1 a 50
});

const toCategoryDto = (c) => ({ id: c.id, name: c.name, type: c.type, icon: c.icon, inUse: c.inUse });

const toItemDto = (i) => ({
  id: i.id,
  name: i.name,
  group: i.group,
  icon: i.icon,
  price: i.price,
  tags: [...i.tags],
  active: i.active,
});

const toCampaignDto = (p) => ({
  id: p.id,
  title: p.title,
  message: p.message,
  target: p.target.kind === 'usuario' ? { kind: 'usuario', username: p.target.username } : { kind: 'todos' },
  recipients: p.recipients,
  sentAt: p.sentAt,
  status: p.status, // 'entregado' | 'fallido' | 'en_cola'
  deliveredPct: p.deliveredPct,
});

module.exports = { toEconomyDto, toCategoryDto, toItemDto, toCampaignDto };
