const { notFound } = require('../../../../shared/errors/AppError');
const { noteView, parseActivityId } = require('../../domain/entities/Activity');

const NOTE_GONE = 'La nota ya no existe.';

// La nota tiene que ser del usuario y de esa actividad; si no, 404
async function buscarNota({ diaryRepository }, userId, activityId, noteId) {
  const note = parseActivityId(activityId) ? await diaryRepository.findNote(userId, noteId) : null;
  if (!note || note.activityId !== activityId.toLowerCase()) throw notFound(NOTE_GONE);
  return note;
}

// RDF095 · actualizarNotaSeguimiento: cambia el texto; la nota queda marcada como editada
const actualizarNotaSeguimiento = (deps) => async (userId, activityId, noteId, text) => {
  await buscarNota(deps, userId, activityId, noteId);
  return noteView(await deps.diaryRepository.updateNote({ noteId, text, at: deps.now() }));
};

// RDF095 · eliminar una nota de seguimiento
const eliminarNotaSeguimiento = (deps) => async (userId, activityId, noteId) => {
  await buscarNota(deps, userId, activityId, noteId);
  await deps.diaryRepository.deleteNote(noteId);
};

module.exports = { actualizarNotaSeguimiento, eliminarNotaSeguimiento };
