const { FriendCodeEntity } = require('../../domain/entities/FriendCode.entity');

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatRelativeActivity(dateValue) {
  if (!dateValue) return 'Sin fecha de actualización';
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 15) return 'Actualizado recientemente';
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Actualizado hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Actualizado ayer';
  return `Actualizado hace ${diffDays} días`;
}

function formatMonthYear(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  return `${MONTHS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatVigencia(entity, status) {
  if (status === 'Revocado' && entity.revokedAt) {
    const d = entity.revokedAt;
    return `revocado ${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
  }
  if (status === 'Expirado') {
    const d = entity.expiresAt;
    return `expiró el ${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
  }
  const diffMs = entity.expiresAt.getTime() - Date.now();
  const diffHours = Math.max(1, Math.round(diffMs / 3600000));
  if (diffHours < 48) return `expira en ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `expira en ${diffDays} días`;
}

class VisualizadorMapper {
  static toPartyMember(userDoc, friendshipDoc) {
    const profile = userDoc.profile || {};
    const ultimaActividadAt = profile.updatedAt || null;
    const rawAlias = profile.alias || userDoc.displayName || 'aventurero';

    return {
      id: userDoc.id,
      nombre: userDoc.displayName || rawAlias,
      alias: rawAlias.startsWith('@') ? rawAlias : `@${rawAlias}`,
      nivel: profile.level ?? 1,
      racha: profile.currentStreak ?? 0,
      estado: formatRelativeActivity(ultimaActividadAt),
      ultimaActividadAt,
      avatarUrl: profile.avatarUrl || null,
      species: profile.species || 'DRAGON',
      mascotColor: profile.mascotColor || 'morado',
      stats: {
        cultura: profile.culturePoints ?? 0,
        fisico: profile.physicalPoints ?? 0,
        enfoque: profile.focusPoints ?? 0,
      },
    };
  }

  static toMirrorProfile(userDoc, friendshipDoc) {
    const profile = userDoc.profile || {};
    const activeOutfit = userDoc.outfits?.[0] || null;
    const latestMood = userDoc.moodLogs?.[0] || null;

    const level = profile.level ?? 1;
    const xp = profile.xp ?? 0;
    const rawAlias = profile.alias || userDoc.displayName || 'aventurero';

    const equippedObj = activeOutfit?.equipped || {};
    const ropaEquipada = Object.values(equippedObj).filter(Boolean);

    // Respuesta estrictamente de solo lectura: omite email, passwordHash y notas privadas
    return {
      id: userDoc.id,
      soloLectura: true,
      nombre: userDoc.displayName || rawAlias,
      alias: rawAlias.startsWith('@') ? rawAlias : `@${rawAlias}`,
      mascota: {
        nombre: profile.mascotName || null,
        especie: profile.species || 'DRAGON',
        color: profile.mascotColor || null,
        avatarUrl: profile.avatarUrl || null,
      },
      amigosDesde: formatMonthYear(friendshipDoc?.acceptedAt),
      nivel: level,
      xp,
      estadisticas: {
        cultura: profile.culturePoints ?? 0,
        fisico: profile.physicalPoints ?? 0,
        enfoque: profile.focusPoints ?? 0,
      },
      racha: {
        actual: profile.currentStreak ?? 0,
        mejor: profile.bestStreak ?? 0,
      },
      ropaEquipada,
      estadoAnimo:
        profile.moodVisibleToViewers && latestMood
          ? { score: latestMood.score, label: latestMood.label || null }
          : null,
    };
  }

  static codeToDomain(doc) {
    return new FriendCodeEntity({
      id: doc.id,
      userId: doc.userId,
      code: doc.code,
      maxUses: doc.maxUses,
      uses: doc.uses,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt,
      createdAt: doc.createdAt,
    });
  }

  static codeToResponse(entity) {
    const estado = entity.getStatus();
    return {
      id: entity.id,
      codigo: entity.code,
      estado,
      usos: entity.uses,
      usosMaximos: entity.maxUses,
      vigencia: formatVigencia(entity, estado),
      expiresAt: entity.expiresAt.toISOString(),
      revokedAt: entity.revokedAt ? entity.revokedAt.toISOString() : null,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : null,
    };
  }
}

module.exports = { VisualizadorMapper };
