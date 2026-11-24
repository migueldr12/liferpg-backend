const { ZONA_POR_DEFECTO } = require('../../../../shared/utils/zonaHoraria');
const { actualizarNotaSeguimiento, eliminarNotaSeguimiento } = require('./actualizarNotaSeguimiento');
const { agregarNotaSeguimiento } = require('./agregarNotaSeguimiento');
const { consultarActividades } = require('./consultarActividades');
const { consultarDetalleActividad } = require('./consultarDetalleActividad');
const { consultarCumplimientoPorPeriodo, consultarDistribucionPorTipo } = require('./consultarGraficas');

// Arma los casos de uso del M09 con sus dependencias (un servicio por RDF).
function createDiaryServices({ diaryRepository, now = () => new Date(), timeZone = ZONA_POR_DEFECTO }) {
  const deps = { diaryRepository, now, timeZone };
  return {
    consultarActividades: consultarActividades(deps),
    consultarDetalleActividad: consultarDetalleActividad(deps),
    agregarNotaSeguimiento: agregarNotaSeguimiento(deps),
    actualizarNotaSeguimiento: actualizarNotaSeguimiento(deps),
    eliminarNotaSeguimiento: eliminarNotaSeguimiento(deps),
    consultarCumplimientoPorPeriodo: consultarCumplimientoPorPeriodo(deps),
    consultarDistribucionPorTipo: consultarDistribucionPorTipo(deps),
  };
}

module.exports = { createDiaryServices };
