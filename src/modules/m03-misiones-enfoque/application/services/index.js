const { agregarMision } = require('./agregarMision');
const { calcularRecompensaMision } = require('./calcularRecompensaMision');
const { consultarHistorialMisiones } = require('./consultarHistorialMisiones');
const { consultarMision } = require('./consultarMision');
const { consultarMisionesActivas } = require('./consultarMisionesActivas');
const { consultarResultadoSesion } = require('./consultarResultadoSesion');
const { finalizarSesionEnfoque } = require('./finalizarSesionEnfoque');
const { iniciarSesionEnfoque } = require('./iniciarSesionEnfoque');
const { rendirseSesion } = require('./rendirseSesion');
const { validarMisionFisica } = require('./validarMisionFisica');

// Arma los casos de uso del M03 con sus dependencias (un servicio por RDF).
function createMissionServices({ missionRepository, now = () => new Date(), allowEarlyFinish = false }) {
  const deps = { missionRepository, now, allowEarlyFinish };
  return {
    consultarMisionesActivas: consultarMisionesActivas(deps),
    consultarMision: consultarMision(deps),
    agregarMision: agregarMision(deps),
    calcularRecompensaMision: calcularRecompensaMision(deps),
    iniciarSesionEnfoque: iniciarSesionEnfoque(deps),
    rendirseSesion: rendirseSesion(deps),
    finalizarSesionEnfoque: finalizarSesionEnfoque(deps),
    consultarResultadoSesion: consultarResultadoSesion(deps),
    validarMisionFisica: validarMisionFisica(deps),
    consultarHistorialMisiones: consultarHistorialMisiones(deps),
  };
}

module.exports = { createMissionServices };
