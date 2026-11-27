const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { AppError } = require('../../../../shared/errors/AppError');
const { userIdFromRequest } = require('../../../../shared/middlewares/currentUser');
const { env } = require('../../../../config/env');

const DEFAULT_USER_ID = '6b0356a060aaa347e384ceb7';

// Misma regla que el resto del backend (shared/middlewares/currentUser.js): con login, el
// usuario de la sesión; sin token, solo fuera de producción, x-user-id o el usuario de prueba.
// Antes, en producción y sin login, caía en el usuario de prueba o en el primero de la base.
// `prisma` se queda en la firma para no tocar a quien la llama.
async function resolveUserId(prisma, req) {
  return userIdFromRequest(req, {
    allowDevHeader: env.allowDevAuth,
    devUserId: env.devUserId || DEFAULT_USER_ID,
  });
}

const REWARD_MAP = {
  EASY: 10,
  MEDIUM: 20,
  HARD: 40,
};

function mapPointTypeToEs(pt) {
  return { CULTURE: 'cultura', PHYSICAL: 'fisico', FOCUS: 'enfoque' }[pt] || 'cultura';
}
function mapPointTypeToPrisma(pt) {
  return (
    {
      cultura: 'CULTURE',
      fisico: 'PHYSICAL',
      enfoque: 'FOCUS',
      CULTURE: 'CULTURE',
      PHYSICAL: 'PHYSICAL',
      FOCUS: 'FOCUS',
    }[pt] || 'CULTURE'
  );
}
function mapDiffToEs(d) {
  return { EASY: 'facil', MEDIUM: 'media', HARD: 'dificil' }[d] || 'media';
}
function mapDiffToPrisma(d) {
  return (
    {
      facil: 'EASY',
      media: 'MEDIUM',
      dificil: 'HARD',
      EASY: 'EASY',
      MEDIUM: 'MEDIUM',
      HARD: 'HARD',
    }[d] || 'MEDIUM'
  );
}
function mapPenaltyToEs(p) {
  return { HP: 'hp', STREAK: 'racha', POINTS: 'puntos' }[p] || 'hp';
}
function mapPenaltyToPrisma(p) {
  return (
    {
      hp: 'HP',
      racha: 'STREAK',
      puntos: 'POINTS',
      HP: 'HP',
      STREAK: 'STREAK',
      POINTS: 'POINTS',
    }[p] || 'HP'
  );
}
function mapPenaltyValue(p) {
  const type = mapPenaltyToPrisma(p);
  if (type === 'HP') return 10;
  if (type === 'POINTS') return 25;
  return 0;
}

function serializeHabit(h) {
  const days = h.frequency === 'WEEKLY' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7];
  return {
    id: h.id,
    name: h.name,
    pointType: mapPointTypeToEs(h.area),
    difficulty: mapDiffToEs(h.difficulty),
    reward: REWARD_MAP[h.difficulty] || 20,
    days,
    focusMinutes: h.focusMinutes ?? null,
    penalty: mapPenaltyToEs(h.penaltyType),
    active: h.active,
    streak: h.currentStreak || 0,
  };
}

function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function toDateKeyInOffset(dateObj, offsetHours = -6) {
  const shifted = new Date(new Date(dateObj).getTime() + offsetHours * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToKey(dateKey, deltaDays) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

// GET /api/v1/habitos/hoy
async function getTodayHabits(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const { start, end } = getTodayBounds();

    const habits = await prisma.habit.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
    });

    const checkIns = await prisma.habitCheckIn.findMany({
      where: {
        userId,
        revertedAt: null,
        periodStart: { gte: start, lt: end },
      },
    });
    const checkInByHabit = new Map(checkIns.map((c) => [c.habitId, c]));

    const todayList = habits.map((h) => {
      const ci = checkInByHabit.get(h.id);
      return {
        ...serializeHabit(h),
        done: Boolean(ci),
        completedAt: ci ? ci.completedAt.toISOString() : null,
      };
    });

    res.json(todayList);
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/habitos
async function getHabits(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const habits = await prisma.habit.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(habits.map(serializeHabit));
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/habitos/:id
async function getHabit(req, res, next) {
  try {
    const prisma = getPrisma();
    const habit = await prisma.habit.findUnique({ where: { id: req.params.id } });
    if (!habit) throw new AppError(404, 'HABIT_NOT_FOUND', 'Hábito no encontrado');
    res.json(serializeHabit(habit));
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/habitos
async function createHabit(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const { name, pointType, difficulty, days, focusMinutes, penalty } = req.body;

    const frequency =
      Array.isArray(days) && days.length > 0 && days.length < 7 ? 'WEEKLY' : 'DAILY';
    const penaltyType = mapPenaltyToPrisma(penalty);

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: name?.trim() || 'Nuevo hábito',
        area: mapPointTypeToPrisma(pointType),
        difficulty: mapDiffToPrisma(difficulty),
        frequency,
        focusMinutes: focusMinutes ? Number(focusMinutes) : null,
        penaltyType,
        penaltyValue: mapPenaltyValue(penalty),
        active: true,
      },
    });

    res.status(201).json(serializeHabit(habit));
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/habitos/:id
async function updateHabit(req, res, next) {
  try {
    const prisma = getPrisma();
    const { name, pointType, difficulty, days, focusMinutes, penalty } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (pointType !== undefined) data.area = mapPointTypeToPrisma(pointType);
    if (difficulty !== undefined) data.difficulty = mapDiffToPrisma(difficulty);
    if (days !== undefined) {
      data.frequency =
        Array.isArray(days) && days.length > 0 && days.length < 7 ? 'WEEKLY' : 'DAILY';
    }
    if (focusMinutes !== undefined) data.focusMinutes = focusMinutes ? Number(focusMinutes) : null;
    if (penalty !== undefined) {
      data.penaltyType = mapPenaltyToPrisma(penalty);
      data.penaltyValue = mapPenaltyValue(penalty);
    }

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data,
    });

    res.json(serializeHabit(habit));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/habitos/:id
async function setHabitActive(req, res, next) {
  try {
    const prisma = getPrisma();
    const { active } = req.body;
    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: { active: Boolean(active) },
    });
    res.json(serializeHabit(habit));
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/habitos/:id/checkin
async function checkInHabit(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const { id: habitId } = req.params;
    const { start, end } = getTodayBounds();

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new AppError(404, 'HABIT_NOT_FOUND', 'Hábito no encontrado');

    const existing = await prisma.habitCheckIn.findFirst({
      where: {
        habitId,
        userId,
        revertedAt: null,
        periodStart: { gte: start, lt: end },
      },
    });
    if (existing) {
      throw new AppError(409, 'ALREADY_CHECKED_IN', 'Este hábito ya fue completado hoy');
    }

    const reward = REWARD_MAP[habit.difficulty] || 20;
    const pointField =
      {
        CULTURE: 'culturePoints',
        PHYSICAL: 'physicalPoints',
        FOCUS: 'focusPoints',
      }[habit.area] || 'culturePoints';

    const checkIn = await prisma.habitCheckIn.create({
      data: {
        habitId,
        userId,
        periodStart: start,
        periodEnd: end,
        completedAt: new Date(),
        xpAwarded: reward,
        pointsAwarded: reward,
      },
    });

    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      const newXp = profile.xp + reward;
      const newLevel = Math.floor(newXp / 500) + 1;
      await prisma.playerProfile.update({
        where: { userId },
        data: {
          xp: newXp,
          level: newLevel,
          [pointField]: { increment: reward },
        },
      });
    }

    res.status(201).json({
      habit: {
        ...serializeHabit(habit),
        done: true,
        completedAt: checkIn.completedAt.toISOString(),
      },
      xpChange: reward,
      pointsChange: reward,
      unlockedAchievements: [],
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/habitos/:id/checkin
async function undoCheckInHabit(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const { id: habitId } = req.params;
    const { start, end } = getTodayBounds();

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new AppError(404, 'HABIT_NOT_FOUND', 'Hábito no encontrado');

    const existing = await prisma.habitCheckIn.findFirst({
      where: {
        habitId,
        userId,
        revertedAt: null,
        periodStart: { gte: start, lt: end },
      },
    });
    if (!existing) {
      throw new AppError(404, 'CHECKIN_NOT_FOUND', 'No hay check-in hoy para deshacer');
    }

    const reward = existing.pointsAwarded || REWARD_MAP[habit.difficulty] || 20;
    const pointField =
      {
        CULTURE: 'culturePoints',
        PHYSICAL: 'physicalPoints',
        FOCUS: 'focusPoints',
      }[habit.area] || 'culturePoints';

    await prisma.habitCheckIn.update({
      where: { id: existing.id },
      data: { revertedAt: new Date() },
    });

    const profile = await prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      const newXp = Math.max(0, profile.xp - reward);
      const newLevel = Math.floor(newXp / 500) + 1;
      await prisma.playerProfile.update({
        where: { userId },
        data: {
          xp: newXp,
          level: newLevel,
          [pointField]: Math.max(0, profile[pointField] - reward),
        },
      });
    }

    res.json({
      habit: {
        ...serializeHabit(habit),
        done: false,
        completedAt: null,
      },
      xpChange: -reward,
      pointsChange: -reward,
      unlockedAchievements: [],
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/habitos/rachas?mes=AAAA-MM[&habito=id]
async function getStreakCalendar(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const offsetHours = -6;
    const todayStr = toDateKeyInOffset(new Date(), offsetHours);
    const month = req.query.mes || todayStr.slice(0, 7);
    const habitId = req.query.habito || null;

    const [year, m] = month.split('-').map(Number);
    const rangeStart = new Date(Date.UTC(year, m - 1, 1) - 62 * 86400000);
    const rangeEnd = new Date(Date.UTC(year, m, 2) + 86400000);

    const [habits, checkIns, profile] = await Promise.all([
      prisma.habit.findMany({
        where: { userId, active: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.habitCheckIn.findMany({
        where: {
          userId,
          revertedAt: null,
          periodStart: { gte: rangeStart, lt: rangeEnd },
        },
        orderBy: { periodStart: 'asc' },
      }),
      prisma.playerProfile.findUnique({ where: { userId } }).catch(() => null),
    ]);

    const filteredHabits = habitId ? habits.filter((h) => h.id === habitId) : habits;
    const filteredCheckIns = habitId
      ? checkIns.filter((c) => c.habitId === habitId)
      : checkIns;

    const daysWithAnyCheckIn = new Set(
      filteredCheckIns.map((c) => toDateKeyInOffset(c.periodStart, offsetHours))
    );

    const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const days = [];
    let completedDays = 0;
    let scheduledDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      if (dateStr > todayStr) {
        days.push({ date: dateStr, status: 'futuro' });
        continue;
      }

      if (filteredHabits.length === 0) {
        days.push({ date: dateStr, status: 'sin_habitos' });
        continue;
      }

      scheduledDays++;
      const dayCheckIns = filteredCheckIns.filter(
        (c) => toDateKeyInOffset(c.periodStart, offsetHours) === dateStr
      );
      const uniqueHabitsDone = new Set(dayCheckIns.map((c) => c.habitId)).size;

      if (uniqueHabitsDone >= filteredHabits.length) {
        completedDays++;
        days.push({ date: dateStr, status: 'completo' });
      } else if (uniqueHabitsDone > 0) {
        days.push({ date: dateStr, status: 'parcial' });
      } else {
        days.push({ date: dateStr, status: dateStr === todayStr ? 'sin_habitos' : 'fallido' });
      }
    }

    let cursor = daysWithAnyCheckIn.has(todayStr)
      ? todayStr
      : daysWithAnyCheckIn.has(addDaysToKey(todayStr, -1))
      ? addDaysToKey(todayStr, -1)
      : null;

    let currentStreak = 0;
    while (cursor && daysWithAnyCheckIn.has(cursor)) {
      currentStreak++;
      cursor = addDaysToKey(cursor, -1);
    }

    const sortedDays = Array.from(daysWithAnyCheckIn).sort();
    let bestStreak = profile?.bestStreak || 0;
    let run = 0;
    let prev = null;
    for (const dayKey of sortedDays) {
      if (prev && addDaysToKey(prev, 1) === dayKey) {
        run++;
      } else {
        run = 1;
      }
      if (run > bestStreak) bestStreak = run;
      prev = dayKey;
    }

    const byHabit = habits.map((h) => {
      const hDays = new Set(
        checkIns
          .filter((c) => c.habitId === h.id)
          .map((c) => toDateKeyInOffset(c.periodStart, offsetHours))
      );
      let hCursor = hDays.has(todayStr)
        ? todayStr
        : hDays.has(addDaysToKey(todayStr, -1))
        ? addDaysToKey(todayStr, -1)
        : null;
      let hStreak = 0;
      while (hCursor && hDays.has(hCursor)) {
        hStreak++;
        hCursor = addDaysToKey(hCursor, -1);
      }
      return {
        habitId: h.id,
        name: h.name,
        streak: hStreak,
      };
    });

    res.json({
      month,
      habitId,
      days,
      completedDays,
      scheduledDays,
      currentStreak,
      bestStreak,
      byHabit,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTodayHabits,
  getHabits,
  getHabit,
  createHabit,
  updateHabit,
  setHabitActive,
  checkInHabit,
  undoCheckInHabit,
  getStreakCalendar,
};