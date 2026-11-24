const { inicioDelDia, toDateKey } = require('../../../../shared/utils/zonaHoraria');
const { chartPeriods, completionBuckets, distribution } = require('../../domain/entities/Activity');
const { cargarActividades } = require('./cargarActividades');

// Actividades cumplidas en los periodos del rango, agrupadas en la zona horaria del juego
async function buckets(deps, userId, range) {
  const todayKey = toDateKey(deps.now(), deps.timeZone);
  const chart = chartPeriods(range, todayKey);
  const since = inicioDelDia(chart.firstDayKey, deps.timeZone);
  const activities = await cargarActividades(deps, userId, { since, status: 'hecha' });
  return completionBuckets(activities, chart, deps.timeZone);
}

// RDF096 · consultarCumplimientoPorPeriodo: barras por día (semana, mes) o por mes (año)
const consultarCumplimientoPorPeriodo = (deps) => (userId, range) => buckets(deps, userId, range);

// RDF097 · consultarDistribucionPorTipo: total cumplido de cada tipo en el rango
const consultarDistribucionPorTipo = (deps) => async (userId, range) => distribution(await buckets(deps, userId, range));

module.exports = { consultarCumplimientoPorPeriodo, consultarDistribucionPorTipo };
