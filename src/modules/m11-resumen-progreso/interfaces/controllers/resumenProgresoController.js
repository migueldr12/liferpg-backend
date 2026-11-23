const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { validators } = require('../validators/resumenProgresoValidator');

// Traduce req/res a llamadas al servicio. El usuario autenticado viene en req.user.id.
function createResumenProgresoController(service) {
  const handler = (method, validate) => asyncHandler(async (req, res) => {
    res.json(await service[method](req.user.id, validate(req.query)));
  });

  return {
    pendientes: handler('consultarMisionesPendientes', validators.fecha),
    pendientesHistorial: handler('consultarPendientesPorFecha', validators.rango),
    cumplimiento: handler('calcularTasaCumplimientoDiaria', validators.rango),
    diasBajaActividad: handler('consultarDiasBajaActividad', validators.rangoConUmbral),
    racha: handler('consultarRachaActual', validators.soloUsuario),
    consistencia: handler('mostrarEstadoConsistencia', validators.soloUsuario),
  };
}

module.exports = { createResumenProgresoController };
