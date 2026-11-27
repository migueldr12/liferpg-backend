const { getPrisma } = require('../database/prisma');
const { createFcmClient } = require('./fcmClient');

// La entrega push es secundaria: no invalida mensajes ya persistidos.
function createPushService({ db = getPrisma, client = createFcmClient() } = {}) {
  return {
    async notifyUsers(userIds, notification) {
      if (!userIds.length || !client.isConfigured()) return { sent: 0, failed: 0 };
      try {
        const devices = await db().device.findMany({ where: { userId: { in: userIds }, active: true }, select: { fcmToken: true } });
        return await client.send(devices.map((device) => device.fcmToken), notification);
      } catch (error) {
        console.error('No se pudo entregar la notificación push:', error.message);
        return { sent: 0, failed: 1 };
      }
    },
  };
}

module.exports = { createPushService };
