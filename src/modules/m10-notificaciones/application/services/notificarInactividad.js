const { friendAlertTitle, friendAlertBody } = require('../../domain/entities/inactivityRules');

// RDF105 · Avisa por push al usuario inactivo y a sus amigos para que le den ánimo.
function createNotificarInactividad({ friends, push }) {
  return async (alertRows) => {
    let ownNotified = 0;
    let friendsNotified = 0;

    for (const alert of alertRows) {
      const name = alert.user.displayName;

      const own = await push.notifyUsers([alert.userId], {
        title: 'Tu mascota te extraña',
        body: alert.message,
        data: { type: 'INACTIVITY', alertId: alert.id },
      });
      ownNotified += own.sent;

      const friendIds = await friends.listFriendIds(alert.userId);
      if (friendIds.length) {
        const res = await push.notifyUsers(friendIds, {
          title: friendAlertTitle(name),
          body: friendAlertBody(name),
          data: { type: 'FRIEND_INACTIVITY', alertId: alert.id, userId: alert.userId },
        });
        friendsNotified += res.sent;
      }
    }
    return { alerts: alertRows.length, ownDevicesNotified: ownNotified, friendDevicesNotified: friendsNotified };
  };
}

module.exports = { createNotificarInactividad };
