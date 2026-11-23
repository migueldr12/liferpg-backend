const { MoodLog } = require('../../domain/entities/MoodLog');
const { toDateKey } = require('../../domain/fechas');

// RDF068 · registrarEstadoAnimo y RDF069 · agregarFactoresInfluencia.
// Guarda el ánimo, la energía y los factores del día.
// Si ya había registro hoy, lo actualiza y NO vuelve a dar XP (+5 XP una vez al día).
// La XP la acredita el M01/M05; este caso de uso solo informa cuánta corresponde.

const XP_POR_REGISTRO = 5;

function makeRegistrarEstadoAnimo({ moodRepository, clock, timeZone }) {
  return async function registrarEstadoAnimo(userId, { mood, energy, factors = [] }) {
    const now = clock();
    const date = toDateKey(now, timeZone);
    const existing = await moodRepository.findLogByDate(userId, date);

    const log = new MoodLog({
      id: existing ? existing.id : null, // null = nuevo; el id lo pone el repositorio
      userId,
      date,
      createdAt: now.toISOString(),
      mood,
      energy,
      factors,
    });
    // El primer registro del día da XP; el repositorio lo suma al perfil junto con el registro
    const xpAwarded = existing ? 0 : XP_POR_REGISTRO;
    const saved = await moodRepository.saveLog(log, { xpAwarded });

    return { log: saved, xpAwarded };
  };
}

module.exports = { makeRegistrarEstadoAnimo, XP_POR_REGISTRO };
