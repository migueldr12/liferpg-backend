const { validationError, notFound, forbidden } = require('../../../../shared/errors/AppError');

const VALID_AREAS = ['CULTURE', 'PHYSICAL', 'FOCUS'];
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'EPIC'];
const VALID_FREQUENCIES = ['DAILY', 'WEEKLY'];
const VALID_PENALTIES = ['HP', 'STREAK', 'POINTS'];

class CreateHabitoService {
  constructor(repository) {
    this.repository = repository;
  }

  async create(userId, payload) {
    const errors = {};
    if (!payload.name || payload.name.trim().length < 2) {
      errors.name = 'El nombre del hábito debe tener al menos 2 caracteres.';
    }
    if (!VALID_AREAS.includes(payload.area)) {
      errors.area = 'El área debe ser CULTURE, PHYSICAL o FOCUS.';
    }
    if (!VALID_DIFFICULTIES.includes(payload.difficulty)) {
      errors.difficulty = 'La dificultad debe ser EASY, MEDIUM, HARD o EPIC.';
    }
    if (payload.frequency && !VALID_FREQUENCIES.includes(payload.frequency)) {
      errors.frequency = 'La frecuencia debe ser DAILY o WEEKLY.';
    }
    if (payload.penaltyType && !VALID_PENALTIES.includes(payload.penaltyType)) {
      errors.penaltyType = 'La penalización debe ser HP, STREAK o POINTS.';
    }

    if (Object.keys(errors).length > 0) {
      throw validationError(errors);
    }

    return this.repository.createHabit({
      userId,
      categoryId: payload.categoryId || null,
      name: payload.name.trim(),
      area: payload.area,
      difficulty: payload.difficulty,
      frequency: payload.frequency || 'DAILY',
      focusMinutes: payload.focusMinutes ? Number(payload.focusMinutes) : null,
      penaltyType: payload.penaltyType || 'HP',
      penaltyValue: payload.penaltyValue ? Number(payload.penaltyValue) : 10,
    });
  }

  async update(userId, habitId, payload) {
    const habit = await this.repository.findHabitById(habitId);
    if (!habit) throw notFound('No se encontró el hábito.');
    if (habit.userId !== userId) throw forbidden('No tienes permiso para editar este hábito.');

    const data = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.area !== undefined && VALID_AREAS.includes(payload.area)) data.area = payload.area;
    if (payload.difficulty !== undefined && VALID_DIFFICULTIES.includes(payload.difficulty)) data.difficulty = payload.difficulty;
    if (payload.frequency !== undefined && VALID_FREQUENCIES.includes(payload.frequency)) data.frequency = payload.frequency;
    if (payload.focusMinutes !== undefined) data.focusMinutes = Number(payload.focusMinutes);
    if (payload.penaltyType !== undefined && VALID_PENALTIES.includes(payload.penaltyType)) data.penaltyType = payload.penaltyType;
    if (payload.penaltyValue !== undefined) data.penaltyValue = Number(payload.penaltyValue);
    if (payload.active !== undefined) data.active = Boolean(payload.active);

    return this.repository.updateHabit(habitId, data);
  }

  async archive(userId, habitId) {
    const habit = await this.repository.findHabitById(habitId);
    if (!habit) throw notFound('No se encontró el hábito.');
    if (habit.userId !== userId) throw forbidden('No tienes permiso para archivar este hábito.');

    await this.repository.archiveHabit(habitId);
    return { archived: true, id: habitId };
  }
}

module.exports = { CreateHabitoService };