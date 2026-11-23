const { JournalEntry } = require('../../domain/entities/JournalEntry');
const { NotFoundError } = require('../../domain/errors');
const { toDateKey } = require('../../domain/fechas');

// Casos de uso del diario rápido (RF021).

// RDF077 · consultarEntradasDiario: entradas propias, de la más reciente a la más antigua
function makeConsultarEntradasDiario({ moodRepository }) {
  return async function consultarEntradasDiario(userId) {
    const entries = await moodRepository.findEntries(userId);
    return [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  };
}

// RDF075 · agregarEntradaDiario: la entrada queda ligada al registro de ánimo del día
function makeAgregarEntradaDiario({ moodRepository, clock, timeZone }) {
  return async function agregarEntradaDiario(userId, { text, shared = false }) {
    const now = clock();
    const date = toDateKey(now, timeZone);
    const todayLog = await moodRepository.findLogByDate(userId, date);
    const entry = new JournalEntry({
      id: null, // nuevo; el id lo pone el repositorio
      userId,
      date,
      createdAt: now.toISOString(),
      text,
      mood: todayLog ? todayLog.mood : null,
      energy: todayLog ? todayLog.energy : null,
      shared,
    });
    return moodRepository.saveEntry(entry);
  };
}

// RDF076 · compartirEntradaDiario y RDF078 · actualizarEntradaDiario (editar)
function makeActualizarEntradaDiario({ moodRepository }) {
  return async function actualizarEntradaDiario(userId, id, changes) {
    const current = await moodRepository.findEntryById(userId, id);
    if (!current) throw new NotFoundError('La entrada no existe.');
    const updated = new JournalEntry({
      ...current,
      text: changes.text ?? current.text,
      shared: changes.shared ?? current.shared,
    });
    return moodRepository.saveEntry(updated);
  };
}

// RDF078 · actualizarEntradaDiario (eliminar)
function makeEliminarEntradaDiario({ moodRepository }) {
  return async function eliminarEntradaDiario(userId, id) {
    const current = await moodRepository.findEntryById(userId, id);
    if (!current) throw new NotFoundError('La entrada no existe.');
    await moodRepository.deleteEntry(userId, id);
  };
}

module.exports = {
  makeConsultarEntradasDiario,
  makeAgregarEntradaDiario,
  makeActualizarEntradaDiario,
  makeEliminarEntradaDiario,
};
