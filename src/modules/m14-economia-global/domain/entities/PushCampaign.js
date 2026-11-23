const { ValidationError } = require('../errors');

// Entidad: aviso push enviado desde la PWA Admin (RDF141, RDF142).
// target: { kind: 'todos' } o { kind: 'usuario', username } (alias del jugador).
// status: 'en_cola' (guardado, sin enviar por FCM), 'entregado' o 'fallido'.

const TITLE_MAX = 50;
const MESSAGE_MAX = 160;
const STATUSES = ['en_cola', 'entregado', 'fallido'];

// "@Camila " → "camila"
const normalizeUsername = (username) => String(username ?? '').trim().replace(/^@/, '');

class PushCampaign {
  constructor({ id = null, title, message, target, recipients = 0, status = 'en_cola', deliveredPct = null, sentAt = null, createdAt = null }) {
    const t = typeof title === 'string' ? title.trim() : '';
    const m = typeof message === 'string' ? message.trim() : '';
    if (!t || !m) throw new ValidationError('El título y el mensaje son obligatorios.');
    if (t.length > TITLE_MAX) throw new ValidationError(`El título no puede pasar de ${TITLE_MAX} caracteres.`);
    if (m.length > MESSAGE_MAX) throw new ValidationError(`El mensaje no puede pasar de ${MESSAGE_MAX} caracteres.`);
    if (target?.kind !== 'todos' && target?.kind !== 'usuario') {
      throw new ValidationError('El destino debe ser "todos" o "usuario".');
    }
    if (target.kind === 'usuario' && !normalizeUsername(target.username)) {
      throw new ValidationError('Escribe el usuario que recibirá el aviso.');
    }
    if (!STATUSES.includes(status)) throw new ValidationError('Estado de envío no válido.');
    this.id = id;
    this.title = t;
    this.message = m;
    this.target = target.kind === 'todos' ? { kind: 'todos' } : { kind: 'usuario', username: normalizeUsername(target.username) };
    this.recipients = recipients;
    this.status = status;
    this.deliveredPct = deliveredPct;
    this.sentAt = sentAt; // ISO 8601: cuándo se envió (o se guardó, si quedó en cola)
    this.createdAt = createdAt;
  }
}

module.exports = { PushCampaign, TITLE_MAX, MESSAGE_MAX, normalizeUsername };
