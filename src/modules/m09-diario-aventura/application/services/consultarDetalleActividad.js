const { noteView, timelineOf } = require('../../domain/entities/Activity');
const { buscarActividad } = require('./buscarActividad');

// RDF093 · consultarDetalleActividad: la actividad con su recorrido y sus notas de seguimiento
const consultarDetalleActividad = (deps) => async (userId, activityId) => {
  const { activity, sources } = await buscarActividad(deps, userId, activityId);
  const notes = await deps.diaryRepository.listNotes(userId, activity.id);
  return { ...activity, timeline: timelineOf(activity, sources), notes: notes.map(noteView) };
};

module.exports = { consultarDetalleActividad };
