const { badRequest, notFound } = require('../../../../shared/errors/AppError');
const { toAchievementDto } = require('../dtos/achievementDtos');
const { catalog } = require('../../domain/entities/achievementCatalog');

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const NOT_FOUND = 'El logro no existe.';

// RDF063 · GET /logros/:id — ficha con condición, avance, fecha de desbloqueo y recompensa.
function makeConsultarDetalleLogro(achievementRepository) {
  return async (userId, id) => {
    if (!OBJECT_ID.test(String(id))) throw notFound(NOT_FOUND);
    const achievement = await achievementRepository.findForUser(id, userId);
    if (!achievement) throw notFound(NOT_FOUND);
    return toAchievementDto(achievement);
  };
}

// RDF064 · POST /logros/:id/reclamar — acredita la recompensa una sola vez.
// 400 si está bloqueado o ya se reclamó (docs/API.md del móvil).
function makeReclamarRecompensaLogro(achievementRepository, clock = () => new Date()) {
  const check = (achievement) => {
    if (!achievement) throw notFound(NOT_FOUND);
    const own = achievement.userAchievements[0];
    if (!own?.unlockedAt) throw badRequest('Todavía no desbloqueas este logro.');
    if (own.claimedAt) throw badRequest('Ya reclamaste esta recompensa.');
    return { pointType: catalog[achievement.code]?.pointType, points: achievement.rewardPoints ?? 0 };
  };

  return async (userId, id) => {
    if (!OBJECT_ID.test(String(id))) throw notFound(NOT_FOUND);
    const { achievement, wallet } = await achievementRepository.claim(id, userId, clock(), check);
    return { achievement: toAchievementDto(achievement), wallet };
  };
}

module.exports = { makeConsultarDetalleLogro, makeReclamarRecompensaLogro };
