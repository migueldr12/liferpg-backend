// Forma de las respuestas JSON de M11 (nombres en español, como el resto del contrato).
const toHabitoPendiente = (h) => ({
  tipo: 'HABITO',
  id: h.id,
  nombre: h.name,
  area: h.area,
  dificultad: h.difficulty,
  frecuencia: h.frequency,
  penalizacion: { tipo: h.penaltyType, valor: h.penaltyValue },
});

const toMisionPendiente = (m) => ({
  tipo: 'MISION',
  id: m.id,
  nombre: m.title,
  area: m.area,
  minutosEstimados: m.estimatedMinutes,
  estado: m.state,
  creadaEn: m.createdAt,
});

const toDiaCumplimiento = (d) => ({
  fecha: d.date,
  cerrado: d.closed,
  habitosDebidos: d.habitsDue,
  habitosCumplidos: d.habitsCompleted,
  pendientes: d.pendingCount,
  tasaCumplimiento: d.completionRate, // porcentaje 0-100; null si ese día no había hábitos
  penalizaciones: d.penaltiesApplied,
});

module.exports = { toHabitoPendiente, toMisionPendiente, toDiaCumplimiento };
