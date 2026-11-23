// Orquesta RDF104 + RDF105: detecta, crea los avisos y notifica. Lo usan el job y el endpoint de administrador.
function createEjecutarRevisionInactividad({ detect, notify }) {
  return async (options) => {
    const result = await detect(options);
    const notifications = result.dryRun
      ? { alerts: 0, ownDevicesNotified: 0, friendDevicesNotified: 0 }
      : await notify(result.createdAlerts);

    return {
      thresholdDays: result.thresholdDays,
      lowRate: result.lowRate,
      dryRun: result.dryRun,
      evaluated: result.evaluated,
      alreadyOpen: result.alreadyOpen,
      resolved: result.resolved,
      created: result.createdAlerts.map((a) => ({
        alertId: a.id,
        userId: a.userId,
        displayName: a.user.displayName,
        message: a.message,
      })),
      wouldCreate: result.wouldCreate,
      notifications,
    };
  };
}

module.exports = { createEjecutarRevisionInactividad };
