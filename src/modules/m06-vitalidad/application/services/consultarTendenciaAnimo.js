const { ValidationError } = require('../../domain/errors');
const { addDays, toDateKey } = require('../../domain/fechas');
const { calcularResumenAnimo, detectarPatronSemanal } = require('./calcularResumenAnimo');

// RDF072 · consultarTendenciaAnimo.
// Serie diaria de ánimo y energía de los últimos 7 (semana) o 30 (mes) días,
// con el resumen (RDF073) y el patrón (RDF074). Los días sin registro van en null.

const DIAS_POR_PERIODO = { semana: 7, mes: 30 };

function makeConsultarTendenciaAnimo({ moodRepository, clock, timeZone }) {
  return async function consultarTendenciaAnimo(userId, period) {
    const days = DIAS_POR_PERIODO[period];
    if (!days) throw new ValidationError('El periodo debe ser "semana" o "mes".');

    const to = toDateKey(clock(), timeZone);
    const from = addDays(to, -(days - 1));
    const logs = await moodRepository.findLogsBetween(userId, from, to);
    const byDate = new Map(logs.map((l) => [l.date, l]));

    const points = Array.from({ length: days }, (_, i) => {
      const date = addDays(from, i);
      const log = byDate.get(date);
      return { date, mood: log ? log.mood : null, energy: log ? log.energy : null };
    });

    return {
      period,
      from,
      to,
      points,
      summary: { ...calcularResumenAnimo(points), pattern: detectarPatronSemanal(points, period) },
    };
  };
}

module.exports = { makeConsultarTendenciaAnimo, DIAS_POR_PERIODO };
