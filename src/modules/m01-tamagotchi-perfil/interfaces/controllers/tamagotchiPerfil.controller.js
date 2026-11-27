const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { AppError, badRequest, unauthorized } = require('../../../../shared/errors/AppError');
const { env } = require('../../../../config/env');
const Vestidor = require('../../domain/entities/Vestidor');

const DEFAULT_USER_ID = '6b0356a060aaa347e384ceb7';
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Igual que shared/middlewares/currentUser.js:
// - con login el usuario viene de la sesión de Firebase (req.user);
// - sin token, solo fuera de producción: un x-user-id de MongoDB se usa tal cual y
//   cualquier otro (la app manda "u-1") es el usuario de prueba (DEV_USER_ID).
// Antes "u-1" no existía en la base y se terminaba usando al primer usuario que hubiera.
function getUserId(req) {
  if (req.authError) throw req.authError;
  if (req.user?.id) return req.user.id;
  if (!env.allowDevAuth) throw unauthorized();
  const header = req.headers['x-user-id'];
  if (header && OBJECT_ID.test(header)) return header;
  return env.devUserId && OBJECT_ID.test(env.devUserId) ? env.devUserId : DEFAULT_USER_ID;
}

function mapSpeciesToEs(species) {
  const map = { CAT: 'gato', DOG: 'perro', DRAGON: 'dragon', HAMSTER: 'hamster', LION: 'leon' };
  return map[species] || 'gato';
}

function mapColorToEs(color) {
  const map = { GREEN: 'verde', PURPLE: 'morado', RED: 'rojo', BLUE: 'azul', ORANGE: 'naranja' };
  return map[color] || 'verde';
}

function mapColorToPrisma(color) {
  const map = { verde: 'GREEN', morado: 'PURPLE', rojo: 'RED', azul: 'BLUE', naranja: 'ORANGE' };
  return map[color] || 'GREEN';
}

function mapSpeciesToPrisma(pet) {
  const map = { gato: 'CAT', perro: 'DOG', dragon: 'DRAGON', hamster: 'HAMSTER', leon: 'LION' };
  return map[pet] || 'CAT';
}

async function ensureUserAndProfile(prisma, userId) {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  }).catch(() => null);

  if (!user) {
    user = await prisma.user.findFirst({
      include: { profile: true },
    });
  }

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  }

  if (!user.profile) {
    const profile = await prisma.playerProfile.create({
      data: {
        userId: user.id,
        mascotName: 'Susi Botitas',
        species: 'CAT',
        mascotColor: 'GREEN',
        level: 1,
        xp: 0,
        hp: 100,
        maxHp: 100,
        culturePoints: 0,
        physicalPoints: 0,
        focusPoints: 0,
      },
    });
    user = { ...user, profile };
  }

  return user;
}

// GET /api/v1/usuarios/me
async function getMe(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const moodToday = await prisma.moodLog.findFirst({
      where: { userId: user.id, dayStart: { gte: startOfDay } },
    }).catch(() => null);

    res.json({
      id: user.id,
      displayName: (user.displayName && user.displayName.trim()) || user.email.split('@')[0],
      hasMoodLogToday: Boolean(moodToday),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/usuarios/me/cuenta
async function getAccount(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);

    const parts = (user.displayName || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    res.json({
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      age: null,
      gender: null,
      goals: [],
      customGoal: null,
      pet: user.profile ? mapSpeciesToEs(user.profile.species) : 'gato',
      photoUrl: null,
      petColor: mapColorToEs(user.profile?.mascotColor),
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/usuarios/me/cuenta
async function updateAccount(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const { firstName, lastName, email, petColor } = req.body;

    const user = await ensureUserAndProfile(prisma, userId);

    const userData = {};
    if (firstName !== undefined || lastName !== undefined) {
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (fullName) userData.displayName = fullName;
    }
    if (email !== undefined && email.trim()) {
      userData.email = email.trim();
    }

    if (Object.keys(userData).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: userData });
    }

    if (petColor !== undefined) {
      await prisma.playerProfile.update({
        where: { userId: user.id },
        data: { mascotColor: mapColorToPrisma(petColor) },
      });
    }

    return getAccount(req, res, next);
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/usuarios/me/mascota
async function choosePet(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const { pet } = req.body;

    const user = await ensureUserAndProfile(prisma, userId);
    await prisma.playerProfile.update({
      where: { userId: user.id },
      data: { species: mapSpeciesToPrisma(pet) },
    });

    return getAccount(req, res, next);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/usuarios/me/puntos
async function getPoints(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);

    res.json({
      cultura: user.profile.culturePoints,
      fisico: user.profile.physicalPoints,
      enfoque: user.profile.focusPoints,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/usuarios/me/atributos
async function getAttributes(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);

    const calc = (val) => ({
      value: val,
      progress: Math.min(1, (val % 500) / 500),
    });

    res.json({
      cultura: calc(user.profile.culturePoints),
      fisico: calc(user.profile.physicalPoints),
      enfoque: calc(user.profile.focusPoints),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/usuarios/me/privacidad
async function getPrivacy(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const viewersCount = prisma.viewerLink
      ? await prisma.viewerLink.count({ where: { playerId: user.id, status: 'ACTIVE' } }).catch(() => 0)
      : 0;

    res.json({
      visibleToViewers: Boolean(user.visibleToViewers),
      viewersCount,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/usuarios/me/privacidad
async function updatePrivacy(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const { visibleToViewers } = req.body;

    await prisma.user.update({
      where: { id: user.id },
      data: { visibleToViewers: Boolean(visibleToViewers) },
    }).catch(() => null);

    return getPrivacy(req, res, next);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/tamagotchi
async function getTamagotchi(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;

    const maxHpValue = p.hpMax ?? p.maxHp ?? 100;
    const xpForNextLevel = p.level * 500;
    const xpProgress = Math.min(1, p.xp / xpForNextLevel);

    res.json({
      id: p.id,
      name: p.mascotName || 'Susi Botitas',
      title: 'Guardián del Enfoque',
      species: mapSpeciesToEs(p.species),
      color: mapColorToEs(p.mascotColor),
      habitat: 'Hábitat del bosque',
      level: p.level,
      xp: p.xp,
      xpForNextLevel,
      xpNextLevel: xpForNextLevel,
      xpProgress,
      hp: p.hp ?? 100,
      hpMax: maxHpValue,
      maxHp: maxHpValue,
      equipped: {
        Cabeza: p.equippedHeadSlug || 'Ninguno',
        Cara: p.equippedFaceSlug || 'Ninguno',
        Cuerpo: p.equippedBodySlug || 'Ninguno',
        Fondo: p.equippedBgSlug || 'La Casa',
      },
    });
  } catch (err) {
    next(err);
  }
}

// Ropa y fondos del catálogo + inventario del jugador. Se filtra en código (no con
// `active: true` ni `consumedAt: null`): en MongoDB esos filtros no encuentran los
// documentos donde el campo no existe.
async function loadWardrobeData(prisma, userId) {
  const [catalog, entries] = await Promise.all([
    prisma.catalogItem.findMany().catch(() => []),
    prisma.inventoryEntry.findMany({ where: { userId } }).catch(() => []),
  ]);
  return { catalog: catalog.filter(Vestidor.isWardrobeItem), entries };
}

// Marca en el inventario (M04) la prenda puesta en cada parte, igual que el perfil.
async function applyEntryUpdates(prisma, updates) {
  for (const { id, equipped } of updates) {
    await prisma.inventoryEntry.update({ where: { id }, data: { equipped } });
  }
}

const lookValues = (o) => ({ head: o?.headSlug, face: o?.faceSlug, body: o?.bodySlug, bg: o?.bgSlug });
const profileLookValues = (p) => ({ head: p.equippedHeadSlug, face: p.equippedFaceSlug, body: p.equippedBodySlug, bg: p.equippedBgSlug });

// GET /api/v1/vestidor/articulos
async function getWardrobe(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;

    const { catalog, entries } = await loadWardrobeData(prisma, user.id);
    res.json(Vestidor.buildWardrobe({ catalog, entries, profile: p }));
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/vestidor/look-actual
async function getCurrentLook(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;

    const activeOutfit = await prisma.outfit.findFirst({
      where: { userId: user.id, isActive: true },
    }).catch(() => null);

    const { catalog } = await loadWardrobeData(prisma, user.id);
    res.json({
      name: activeOutfit?.name || 'Look casual',
      slots: Vestidor.slotNames({ catalog, values: profileLookValues(p) }),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/vestidor/looks
async function getSavedLooks(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const outfits = await prisma.outfit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    }).catch(() => []);

    // Los detalles muestran el nombre de cada prenda, no su clave.
    const { catalog } = await loadWardrobeData(prisma, user.id);
    res.json(
      outfits.map((o) => ({
        id: o.id,
        name: o.name,
        details: Object.values(Vestidor.slotNames({ catalog, values: lookValues(o), empty: null }))
          .filter(Boolean)
          .join(' · '),
        color: '#9C27B0',
        inUse: o.isActive,
      }))
    );
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/vestidor/looks
async function saveLook(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    // Contrato (docs/API.md): nombre obligatorio, máx. 24 caracteres; si ya existe, se actualiza.
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw badRequest('Escribe el nombre del look.');
    if (name.length > 24) throw badRequest('El nombre del look no puede pasar de 24 caracteres.');

    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;
    const slots = {
      headSlug: p.equippedHeadSlug ?? null,
      faceSlug: p.equippedFaceSlug ?? null,
      bodySlug: p.equippedBodySlug ?? null,
      bgSlug: p.equippedBgSlug ?? null,
    };
    // `equipped` (JSON) es obligatorio en el modelo Outfit: sin él Prisma rechazaba el alta.
    const data = { ...slots, equipped: { head: slots.headSlug, face: slots.faceSlug, body: slots.bodySlug, bg: slots.bgSlug }, isActive: true };

    await prisma.outfit.updateMany({ where: { userId: user.id }, data: { isActive: false } });
    const same = await prisma.outfit.findFirst({ where: { userId: user.id, name } });
    if (same) await prisma.outfit.update({ where: { id: same.id }, data });
    else await prisma.outfit.create({ data: { userId: user.id, name, ...data } });

    return getSavedLooks(req, res, next);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/vestidor/looks/:id/usar
async function applySavedLook(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const { id } = req.params;

    const outfit = await prisma.outfit.findUnique({ where: { id } });
    if (!outfit || outfit.userId !== user.id) {
      throw new AppError(404, 'OUTFIT_NOT_FOUND', 'Look no encontrado');
    }

    await prisma.outfit.updateMany({ where: { userId: user.id }, data: { isActive: false } });
    await prisma.outfit.update({ where: { id }, data: { isActive: true } });
    const profile = await prisma.playerProfile.update({
      where: { userId: user.id },
      data: {
        equippedHeadSlug: outfit.headSlug,
        equippedFaceSlug: outfit.faceSlug,
        equippedBodySlug: outfit.bodySlug,
        equippedBgSlug: outfit.bgSlug,
      },
    });
    // El inventario de la Tienda queda con las mismas prendas puestas.
    const { catalog, entries } = await loadWardrobeData(prisma, user.id);
    await applyEntryUpdates(prisma, Vestidor.syncEntries({ catalog, entries, profile }));

    return getSavedLooks(req, res, next);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/vestidor/articulos/:id
async function setEquipped(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const equipped = req.body?.equipped;
    if (typeof equipped !== 'boolean') throw badRequest('Indica si la prenda se pone o se quita.');

    // La app manda el `id` de GET /vestidor/articulos: el nombre de la imagen
    // (también se acepta el id o el slug del catálogo).
    const { catalog, entries } = await loadWardrobeData(prisma, user.id);
    const item = Vestidor.findWardrobeItem(catalog, req.params.id);
    if (!item) throw new AppError(404, 'ITEM_NOT_FOUND', 'Artículo no encontrado');

    const plan = Vestidor.planEquip({ catalog, entries, profile: user.profile, item, equipped });
    if (plan.error) throw badRequest(plan.error);

    const profile = Object.keys(plan.profileData).length
      ? await prisma.playerProfile.update({ where: { userId: user.id }, data: plan.profileData })
      : user.profile;
    await applyEntryUpdates(prisma, plan.entryUpdates);

    const fresh = await prisma.inventoryEntry.findMany({ where: { userId: user.id } }).catch(() => entries);
    res.json(Vestidor.buildWardrobe({ catalog, entries: fresh, profile }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  getAccount,
  updateAccount,
  choosePet,
  getPoints,
  getAttributes,
  getPrivacy,
  updatePrivacy,
  getTamagotchi,
  getWardrobe,
  getCurrentLook,
  getSavedLooks,
  saveLook,
  applySavedLook,
  setEquipped,
};