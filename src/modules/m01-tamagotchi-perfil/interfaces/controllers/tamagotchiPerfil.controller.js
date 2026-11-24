const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { AppError } = require('../../../../shared/errors/AppError');

const DEFAULT_USER_ID = '6b0356a060aaa347e384ceb7';

function getUserId(req) {
  // M00: con login el usuario viene de la sesión de Firebase (req.user)
  if (req.authError) throw req.authError;
  if (req.user?.id) return req.user.id;
  return req.headers['x-user-id'] || DEFAULT_USER_ID;
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

function mapPointTypeToEs(pt) {
  const map = { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' };
  return map[pt] || 'cultura';
}

function mapCategoryToEs(cat) {
  const map = { HEAD: 'Cabeza', FACE: 'Cara', BODY: 'Cuerpo', BACKGROUND: 'Fondo' };
  return map[cat] || 'Cabeza';
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

// GET /api/v1/vestidor/articulos
async function getWardrobe(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = getUserId(req);
    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;

    const catalogModel = prisma.catalogItem || prisma.storeCatalogItem;
    const inventoryModel = prisma.inventoryEntry || prisma.inventoryItem;

    const catalog = catalogModel
      ? await catalogModel.findMany({ where: { kind: 'CLOTHING' } }).catch(() => catalogModel.findMany())
      : [];
    const ownedItems = inventoryModel
      ? await inventoryModel.findMany({ where: { userId: user.id } }).catch(() => [])
      : [];

    const ownedSlugs = new Set(ownedItems.map((i) => i.catalogSlug || i.itemSlug || i.slug));
    const equippedSlugs = new Set(
      [p.equippedHeadSlug, p.equippedFaceSlug, p.equippedBodySlug, p.equippedBgSlug].filter(Boolean)
    );

    const items = catalog.map((item) => {
      const slug = item.slug || item.id;
      const owned = ownedSlugs.has(slug);
      const equipped = equippedSlugs.has(slug);
      let status = `${item.price ?? 100} pts`;
      if (equipped) status = 'Equipado';
      else if (owned) status = 'Tuyo';
      else if (item.unlockNote) status = item.unlockNote;

      return {
        id: slug,
        name: item.name,
        stat: mapPointTypeToEs(item.pointType),
        icon: item.icon || 'star',
        status,
        equipped,
        owned,
        category: mapCategoryToEs(item.slot || item.category),
      };
    });

    res.json(items);
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

    res.json({
      name: activeOutfit?.name || 'Look casual',
      slots: {
        Cabeza: p.equippedHeadSlug || 'Vacío',
        Cara: p.equippedFaceSlug || 'Vacío',
        Cuerpo: p.equippedBodySlug || 'Vacío',
        Fondo: p.equippedBgSlug || 'La Casa',
      },
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

    res.json(
      outfits.map((o) => ({
        id: o.id,
        name: o.name,
        details: [o.headSlug, o.faceSlug, o.bodySlug, o.bgSlug || 'La Casa'].filter(Boolean).join(' · '),
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
    const { name } = req.body;
    const user = await ensureUserAndProfile(prisma, userId);
    const p = user.profile;

    await prisma.outfit.updateMany({ where: { userId: user.id }, data: { isActive: false } });
    await prisma.outfit.create({
      data: {
        userId: user.id,
        name: name || 'Nuevo look',
        headSlug: p.equippedHeadSlug,
        faceSlug: p.equippedFaceSlug,
        bodySlug: p.equippedBodySlug,
        bgSlug: p.equippedBgSlug,
        isActive: true,
      },
    });

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
    await prisma.playerProfile.update({
      where: { userId: user.id },
      data: {
        equippedHeadSlug: outfit.headSlug,
        equippedFaceSlug: outfit.faceSlug,
        equippedBodySlug: outfit.bodySlug,
        equippedBgSlug: outfit.bgSlug,
      },
    });

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
    const { id: slug } = req.params;
    const { equipped } = req.body;

    const catalogModel = prisma.catalogItem || prisma.storeCatalogItem;
    const catalogItem = catalogModel
      ? await catalogModel.findUnique({ where: { slug } }).catch(() => null)
      : null;

    if (!catalogItem) {
      throw new AppError(404, 'ITEM_NOT_FOUND', 'Artículo no encontrado');
    }

    const slotFieldMap = {
      HEAD: 'equippedHeadSlug',
      FACE: 'equippedFaceSlug',
      BODY: 'equippedBodySlug',
      BACKGROUND: 'equippedBgSlug',
    };
    const field = slotFieldMap[catalogItem.slot];

    if (field) {
      await prisma.playerProfile.update({
        where: { userId: user.id },
        data: { [field]: equipped ? slug : null },
      });
    }

    return getWardrobe(req, res, next);
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