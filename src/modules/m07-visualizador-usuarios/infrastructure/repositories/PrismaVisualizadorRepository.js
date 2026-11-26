const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { VisualizadorRepository } = require('../../domain/repositories/VisualizadorRepository');
const { VisualizadorMapper } = require('../mappers/Visualizador.mapper');

class PrismaVisualizadorRepository extends VisualizadorRepository {
  async getAcceptedFriends(userId) {
    const prisma = getPrisma();
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { include: { profile: true } },
        addressee: { include: { profile: true } },
      },
    });

    return friendships
      .map((f) => {
        const friendUser = String(f.requesterId) === String(userId) ? f.addressee : f.requester;
        if (!friendUser) return null;
        return VisualizadorMapper.toPartyMember(friendUser, f);
      })
      .filter(Boolean);
  }

  async countAcceptedFriends(userId) {
    const prisma = getPrisma();
    return prisma.friendship.count({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });
  }

  async findAcceptedFriendshipBetween(userId, targetUserId) {
    const prisma = getPrisma();
    return prisma.friendship.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId, addresseeId: targetUserId },
          { requesterId: targetUserId, addresseeId: userId },
        ],
      },
    });
  }

  async deleteFriendship(friendshipId) {
    const prisma = getPrisma();
    return prisma.friendship.delete({
      where: { id: friendshipId },
    });
  }

  async getMirrorProfileData(targetUserId) {
    const prisma = getPrisma();
    return prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        outfits: { where: { isActive: true }, take: 1 },
        moodLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async listCodesByUser(userId) {
    const prisma = getPrisma();
    const docs = await prisma.friendCode.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return docs.map(VisualizadorMapper.codeToDomain);
  }

  async createFriendCode(data) {
    const prisma = getPrisma();
    const created = await prisma.friendCode.create({ data });
    return VisualizadorMapper.codeToDomain(created);
  }

  async findCodeById(codeId) {
    const prisma = getPrisma();
    const doc = await prisma.friendCode.findUnique({ where: { id: codeId } });
    return doc ? VisualizadorMapper.codeToDomain(doc) : null;
  }

  async revokeCode(codeId) {
    const prisma = getPrisma();
    const updated = await prisma.friendCode.update({
      where: { id: codeId },
      data: { revokedAt: new Date() },
    });
    return VisualizadorMapper.codeToDomain(updated);
  }

  async findCodeByString(code) {
    const prisma = getPrisma();
    const doc = await prisma.friendCode.findUnique({ where: { code } });
    return doc ? VisualizadorMapper.codeToDomain(doc) : null;
  }

  async redeemCodeAndCreateFriendship({ codeRecord, redeemerId, pairKey }) {
    const prisma = getPrisma();
    const [updatedCode, friendship] = await prisma.$transaction([
      prisma.friendCode.update({
        where: { id: codeRecord.id },
        data: { uses: { increment: 1 } },
      }),
      prisma.friendship.upsert({
        where: { pairKey },
        update: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          endedAt: null,
        },
        create: {
          requesterId: codeRecord.userId,
          addresseeId: redeemerId,
          pairKey,
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      }),
    ]);

    return {
      code: VisualizadorMapper.codeToDomain(updatedCode),
      friendship,
    };
  }
}

module.exports = { PrismaVisualizadorRepository };