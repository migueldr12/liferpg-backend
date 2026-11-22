const { agregarMision } = require('./agregarMision');
const { calcularRecompensaMision } = require('./calcularRecompensaMision');
const { consultarHistorialMisiones } = require('./consultarHistorialMisiones');
const { consultarMisionesActivas } = require('./consultarMisionesActivas');
const { finalizarSesionEnfoque } = require('./finalizarSesionEnfoque');
const { iniciarSesionEnfoque } = require('./iniciarSesionEnfoque');
const { rendirseSesion } = require('./rendirseSesion');
const { validarMisionFisica } = require('./validarMisionFisica');

// Arma los casos de uso del M03 con sus dependencias (un servicio por RDF).
function createMissionServices({ missionRepository, now = () => new Date(), allowEarlyFinish = false }) {
  const deps = { missionRepository, now, allowEarlyFinish };
  return {
    consultarMisionesActivas: consultarMisionesActivas(deps),
    agregarMision: agregarMision(deps),
    calcularRecompensaMision: calcularRecompensaMision(deps),
    iniciarSesionEnfoque: iniciarSesionEnfoque(deps),
    rendirseSesion: rendirseSesion(deps),
    finalizarSesionEnfoque: finalizarSesionEnfoque(deps),
    validarMisionFisica: validarMisionFisica(deps),
    consultarHistorialMisiones: consultarHistorialMisiones(deps),
  };
}

module.exports = { createMissionServices };
