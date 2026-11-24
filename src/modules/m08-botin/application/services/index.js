const { consultarAmigos } = require('./consultarAmigos');
const { consultarCofre } = require('./consultarCofre');
const { consultarHistorial } = require('./consultarHistorial');
const { enviarRegalo } = require('./enviarRegalo');
const { consultarCofreAmigo, consultarSolicitudes, responderSolicitud, solicitarRegalo } = require('./solicitudes');

// Arma los casos de uso del M08 con sus dependencias (un servicio por RDF).
function createBotinServices({ botinRepository, pushSender = null, now = () => new Date() }) {
  const deps = { botinRepository, pushSender, now };
  return {
    consultarAmigos: consultarAmigos(deps),
    consultarCofre: consultarCofre(deps),
    enviarRegalo: enviarRegalo(deps),
    consultarSolicitudes: consultarSolicitudes(deps),
    responderSolicitud: responderSolicitud(deps),
    consultarCofreAmigo: consultarCofreAmigo(deps),
    solicitarRegalo: solicitarRegalo(deps),
    consultarHistorial: consultarHistorial(deps),
  };
}

module.exports = { createBotinServices };
