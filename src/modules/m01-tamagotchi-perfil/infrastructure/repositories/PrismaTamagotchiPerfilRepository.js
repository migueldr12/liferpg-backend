const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { TamagotchiPerfilRepository } = require('../../domain/repositories/TamagotchiPerfilRepository');
const { TamagotchiPerfilMapper } = require('../mappers/TamagotchiPerfil.mapper');

class PrismaTamagotchiPerfilRepository extends TamagotchiPerfilRepository {
  async getHudData(userId) {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        outfits: { where: { isActive: true }, take: 1 },
        moodLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!user || !user.profile) return null;

    return {
      profile: TamagotchiPerfilMapper.toDomain(user, user.profile),
      activeOutfit: user.outfits[0] || null,
      latestMood: user.moodLogs[0] || null,
    };
  }

  async getVestidorData(userId) {
    const prisma = getPrisma();
    const [profile, inventory, outfits] = await Promise.all([
      prisma.playerProfile.findUnique({ where: { userId } }),
      prisma.inventoryEntry.findMany({
        where: { userId, consumedAt: null },
        include: { catalogItem: true },
      }),
      prisma.outfit.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    if (!profile) return null;
    return { profile, inventory, outfits };
  }

  async saveAndEquipLook(userId, { outfitId, name, equipped }) {
    const prisma = getPrisma();
    await prisma.outfit.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    if (outfitId) {
      return prisma.outfit.update({
        where: { id: outfitId },
        data: { name, equipped, isActive: true },
      });
    }

    return prisma.outfit.create({
      data: { userId, name, equipped, isActive: true },
    });
  }

  async activateLook(userId, outfitId) {
    const prisma = getPrisma();
    await prisma.outfit.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return prisma.outfit.update({
      where: { id: outfitId },
      data: { isActive: true },
    });
  }

  async updateProfile(userId, { userFields, profileFields }) {
    const prisma = getPrisma();
    const [updatedUser, updatedProfile] = await prisma.$transaction([
      Object.keys(userFields).length > 0
        ? prisma.user.update({ where: { id: userId }, data: userFields })
        : prisma.user.findUnique({ where: { id: userId } }),
      Object.keys(profileFields).length > 0
        ? prisma.playerProfile.update({ where: { userId }, data: profileFields })
        : prisma.playerProfile.findUnique({ where: { userId } }),
    ]);

    return TamagotchiPerfilMapper.toDomain(updatedUser, updatedProfile);
  }
}

module.exports = { PrismaTamagotchiPerfilRepository };