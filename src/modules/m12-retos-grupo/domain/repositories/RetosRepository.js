// Contratos de datos del M12: QUÉ operaciones existen, no CÓMO se hacen.
// Implementación real: infrastructure/repositories/Prisma*Repository.js (MongoDB).

/* eslint-disable no-unused-vars */
const noImplementado = () => {
  throw new Error('No implementado');
};

// Amigos y datos públicos de cada jugador
class SocialRepository {
  async findFriendIds(userId) { noImplementado(); } // amistades aceptadas
  async findPeople(userIds) { noImplementado(); } // → [{ id, name, fullName, avatar, color, level }]
}

// Retos, participantes y aportaciones
class ChallengeRepository {
  async createChallenge(challenge, invitedIds) { noImplementado(); } // creador ACEPTADO, invitados INVITED
  async findActiveForUser(userId, fromDeadline) { noImplementado(); } // retos donde participa (aceptado) que no han vencido
  async findById(challengeId) { noImplementado(); }
  async findInvitations(userId, fromDeadline) { noImplementado(); } // → [{ id, challenge }]
  async findInvitationById(userId, invitationId) { noImplementado(); }
  async answerInvitation(invitationId, accept, at) { noImplementado(); }
  async findContributionKeys(challengeId) { noImplementado(); } // Set de "activityType|activityId"
  async addContributions(challengeId, userId, activities) { noImplementado(); }
  async saveProgress(challenge) { noImplementado(); } // aportación de cada participante y total
  async completeAndReward(challengeId, userIds, rewardItemId) { noImplementado(); } // → true solo la primera vez
  async findRewardItem() { noImplementado(); } // → { id, name } | null
}

// Actividad de los jugadores (lectura de hábitos, misiones y sesiones de enfoque)
class ActivityRepository {
  async findActivity(userIds, { from, to }) { noImplementado(); } // → { habits, checkIns, missions, sessions }
}

module.exports = { SocialRepository, ChallengeRepository, ActivityRepository };
