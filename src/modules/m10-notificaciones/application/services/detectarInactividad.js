const { evaluateInactivity, ownAlertMessage } = require('../../domain/entities/inactivityRules');

const DAY_MS = 24 * 60 * 60 * 1000;

// RDF104 · Detecta jugadores sin registros (o con baja tasa de cumplimiento) durante N días,
// crea su aviso de inactividad y cierra los avisos de quienes ya volvieron.
function createDetectarInactividad({ activity, alerts }) {
  return async ({ now = new Date(), thresholdDays, lowRate, dryRun = false }) => {
    const since = new Date(now.getTime() - thresholdDays * DAY_MS);
    const candidates = await activity.listCandidates({ createdBefore: since });

    const [counts, rates, openUserIds] = await Promise.all([
      activity.countActivityByUser({ since }),
      activity.completionRatesByUser({ since }),
      alerts.findOpenUserIds(candidates.map((u) => u.id)),
    ]);

    const toCreate = [];
    const toResolve = [];
    let alreadyOpen = 0;
    for (const user of candidates) {
      const verdict = evaluateInactivity({
        activityCount: counts.get(user.id) ?? 0,
        completionRates: rates.get(user.id) ?? [],
        lowRate,
      });
      const hasOpenAlert = openUserIds.has(user.id);
      if (verdict.inactive && hasOpenAlert) alreadyOpen += 1;
      else if (verdict.inactive) toCreate.push({ user, reason: verdict.reason });
      else if (hasOpenAlert) toResolve.push(user.id);
    }

    const summary = { thresholdDays, lowRate, evaluated: candidates.length, alreadyOpen, dryRun };
    if (dryRun) {
      return {
        ...summary,
        resolved: 0,
        createdAlerts: [],
        wouldCreate: toCreate.map(({ user, reason }) => ({ userId: user.id, displayName: user.displayName, reason })),
      };
    }

    const resolved = await alerts.resolveOpenForUsers(toResolve, now);
    const createdAlerts = [];
    for (const { user, reason } of toCreate) {
      createdAlerts.push(
        await alerts.create({ userId: user.id, message: ownAlertMessage(reason, thresholdDays), thresholdDays }),
      );
    }
    return { ...summary, resolved, createdAlerts, wouldCreate: [] };
  };
}

module.exports = { createDetectarInactividad };
