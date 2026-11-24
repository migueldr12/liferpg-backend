const { tramos, armarComparativa } = require('../../domain/comparativaMensual');

// RF018 · GET /progreso/comparativa (RDF065 a RDF067): días 1 a hoy de este mes contra los
// mismos días del mes anterior, en la zona horaria del juego (TIME_ZONE).
function makeConsultarComparativaMensual({ progressRepository, clock = () => new Date(), timeZone }) {
  return async (userId) => {
    const periodos = tramos(clock(), timeZone);
    const [actual, anterior] = await Promise.all([
      progressRepository.activityBetween(userId, periodos.actual),
      progressRepository.activityBetween(userId, periodos.anterior),
    ]);
    return armarComparativa({ periodos, actual, anterior, timeZone });
  };
}

module.exports = { makeConsultarComparativaMensual };
