const { toAchievementDto } = require('../dtos/achievementDtos');

function makeConsultarLogros(achievementRepository) {
  return async (userId) => {
    const achievements = await achievementRepository.listForUser(userId);
    return achievements.map(toAchievementDto);
  };
}

module.exports = { makeConsultarLogros };
