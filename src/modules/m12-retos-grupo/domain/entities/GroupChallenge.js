const { ValidationError } = require('../errors');

// Entidad: reto grupal con meta acumulativa (RF037).
// type   = área de la actividad que cuenta: cultura, fisico o enfoque.
// metric = qué se suma: hábitos cumplidos, misiones, minutos de enfoque o XP.
// La fecha límite es un día "AAAA-MM-DD" (cuenta completo, en la zona del juego).

const AREAS = ['cultura', 'fisico', 'enfoque'];
const METRICS = {
  habitos: 'hábitos cumplidos',
  misiones: 'misiones',
  minutos: 'min de enfoque',
  xp: 'XP',
};
const TITLE_MAX = 60;
const GOAL_MAX = 100000;
const INVITED_MAX = 10;
const DIAS_MAX = 365;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

class GroupChallenge {
  constructor({
    id = null, title, type, metric, goal, deadline, creatorId, createdAt = null,
    status = 'activo', total = 0, participants = [], invitedCount = 0, reward = null,
  }) {
    const clean = typeof title === 'string' ? title.trim() : '';
    if (!clean) throw new ValidationError('Escribe el nombre del reto.');
    if (clean.length > TITLE_MAX) throw new ValidationError(`El nombre no puede pasar de ${TITLE_MAX} caracteres.`);
    if (!AREAS.includes(type)) throw new ValidationError('El tipo debe ser cultura, fisico o enfoque.');
    if (!(metric in METRICS)) throw new ValidationError('La métrica debe ser habitos, misiones, minutos o xp.');
    if (!Number.isInteger(goal) || goal < 1 || goal > GOAL_MAX) {
      throw new ValidationError(`La meta debe ser un entero de 1 a ${GOAL_MAX}.`);
    }
    if (!FECHA.test(deadline ?? '')) throw new ValidationError('La fecha límite debe tener formato AAAA-MM-DD.');
    this.id = id;
    this.title = clean;
    this.type = type;
    this.metric = metric;
    this.goal = goal;
    this.deadline = deadline;
    this.creatorId = creatorId;
    this.createdAt = createdAt; // ISO 8601
    this.status = status; // 'activo' | 'completado'
    this.total = total;
    this.participants = participants; // [{ userId, amount, joinedAt }] solo los que aceptaron
    this.invitedCount = invitedCount; // invitaciones sin responder
    this.reward = reward;
  }

  get unit() {
    return METRICS[this.metric];
  }

  // RDF117: la fecha límite debe ser posterior a hoy y no más de un año
  static validarFechaLimite(deadline, today, addDays) {
    if (deadline <= today) throw new ValidationError('La fecha límite debe ser posterior a hoy.');
    if (deadline > addDays(today, DIAS_MAX)) throw new ValidationError('La fecha límite no puede pasar de un año.');
  }

  // RDF117: al menos un amigo invitado, sin repetir y solo amigos
  static validarInvitados(invited, friendIds) {
    const unicos = [...new Set(invited ?? [])];
    if (!unicos.length) throw new ValidationError('Invita al menos a un amigo.');
    if (unicos.length > INVITED_MAX) throw new ValidationError(`Puedes invitar hasta ${INVITED_MAX} amigos.`);
    if (unicos.some((id) => !friendIds.has(id))) throw new ValidationError('Solo puedes invitar a tus amigos.');
    return unicos;
  }
}

module.exports = { GroupChallenge, AREAS, METRICS, TITLE_MAX, GOAL_MAX, INVITED_MAX };
