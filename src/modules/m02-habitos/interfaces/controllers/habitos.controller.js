const { getPrisma } = require('../../../../shared/infrastructure/database/prisma');
const { AppError } = require('../../../../shared/errors/AppError');

const DEFAULT_USER_ID = '6b0356a060aaa347e384ceb7';

async function resolveUserId(prisma, req) {
  const headerId = req.headers['x-user-id'];
  if (headerId) {
    const found = await prisma.user.findUnique({ where: { id: headerId } }).catch(() => null);
    if (found) return found.id;
  }
  const defaultUser = await prisma.user.findUnique({ where: { id: DEFAULT_USER_ID } }).catch(() => null);
  if (defaultUser) return defaultUser.id;
  const firstUser = await prisma.user.findFirst().catch(() => null);
  return firstUser ? firstUser.id : DEFAULT_USER_ID;
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
  return { cultura: 'CULTURE', fisico: 'PHYSICAL', enfoque: 'FOCUS', CULTURE: 'CULTURE', PHYSICAL: 'PHYSICAL', FOCUS: 'FOCUS' }[pt] || 'CULTURE';
}
function mapDiffToEs(d) {
  return { EASY: 'facil', MEDIUM: 'media', HARD: 'dificil' }[d] || 'media';
}
function mapDiffToPrisma(d) {
  return { facil: 'EASY', media: 'MEDIUM', dificil: 'HARD', EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' }[d] || 'MEDIUM';
}
function mapPenaltyToEs(p) {
  return { HP: 'hp', STREAK: 'racha', POINTS: 'puntos' }[p] || 'hp';
}
function mapPenaltyToPrisma(p) {
  return { hp: 'HP', racha: 'STREAK', puntos: 'POINTS', HP: 'HP', STREAK: 'STREAK', POINTS: 'POINTS' }[p] || 'HP';
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

function toLocalDateStr(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

    const frequency = Array.isArray(days) && days.length > 0 && days.length < 7 ? 'WEEKLY' : 'DAILY';
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
      data.frequency = Array.isArray(days) && days.length > 0 && days.length < 7 ? 'WEEKLY' : 'DAILY';
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
    const pointField = {
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

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: { increment: 1 },
        bestStreak: { increment: 1 },
      },
    }).catch(() => habit);

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
        ...serializeHabit(updatedHabit),
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
    const pointField = {
      CULTURE: 'culturePoints',
      PHYSICAL: 'physicalPoints',
      FOCUS: 'focusPoints',
    }[habit.area] || 'culturePoints';

    await prisma.habitCheckIn.update({
      where: { id: existing.id },
      data: { revertedAt: new Date() },
    });

    const updatedHabit = await prisma.habit.update({
      where: { id: habitId },
      data: {
        currentStreak: Math.max(0, (habit.currentStreak || 1) - 1),
      },
    }).catch(() => habit);

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
        ...serializeHabit(updatedHabit),
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

// GET /api/v1/habitos/rachas
async function getStreakCalendar(req, res, next) {
  try {
    const prisma = getPrisma();
    const userId = await resolveUserId(prisma, req);
    const todayStr = toLocalDateStr(new Date());
    const month = req.query.mes || todayStr.slice(0, 7);
    const habitId = req.query.habito || null;

    const [year, m] = month.split('-').map(Number);
    const monthStart = new Date(year, m - 1, 1);
    const monthEnd = new Date(year, m, 1);

    const habits = await prisma.habit.findMany({
      where: { userId, active: true, ...(habitId ? { id: habitId } : {}) },
    });

    const checkIns = await prisma.habitCheckIn.findMany({
      where: {
        userId,
        revertedAt: null,
        periodStart: { gte: monthStart, lt: monthEnd },
        ...(habitId ? { habitId } : {}),
      },
    });

    const daysInMonth = new Date(year, m, 0).getDate();
    const days = [];
    let completedDays = 0;
    let scheduledDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, '0')}`;
      if (dateStr > todayStr) {
        days.push({ date: dateStr, status: 'futuro' });
        continue;
      }
      if (habits.length === 0) {
        days.push({ date: dateStr, status: 'sin_habitos' });
        continue;
      }
      scheduledDays++;
      const doneCount = checkIns.filter((c) => toLocalDateStr(new Date(c.periodStart)) === dateStr).length;
      if (doneCount >= habits.length) {
        completedDays++;
        days.push({ date: dateStr, status: 'completo' });
      } else if (doneCount > 0) {
        days.push({ date: dateStr, status: 'parcial' });
      } else {
        days.push({ date: dateStr, status: dateStr === todayStr ? 'sin_habitos' : 'fallido' });
      }
    }

    const currentStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak || 0), 0);
    const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak || 0), 0);

    res.json({
      month,
      habitId,
      days,
      completedDays,
      scheduledDays,
      currentStreak,
      bestStreak,
      byHabit: habits.map((h) => ({
        habitId: h.id,
        name: h.name,
        streak: h.currentStreak || 0,
      })),
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