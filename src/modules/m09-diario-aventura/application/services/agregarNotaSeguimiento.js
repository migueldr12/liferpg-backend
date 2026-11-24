const { noteView } = require('../../domain/entities/Activity');
const { buscarActividad } = require('./buscarActividad');

// RDF094 · agregarNotaSeguimiento: nota con fecha sobre una actividad del diario
const agregarNotaSeguimiento = (deps) => async (userId, activityId, text) => {
  const { activity } = await buscarActividad(deps, userId, activityId);
  const note = await deps.diaryRepository.createNote({ userId, origin: activity.origin, activityId: activity.id, text, at: deps.now() });
  return noteView(note);
};

module.exports = { agregarNotaSeguimiento };
