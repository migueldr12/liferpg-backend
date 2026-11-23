const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { toJournalEntryDto, toMoodLogDto } = require('../../application/dtos/moodDtos');

// Controlador del M06: traduce req/res de Express a llamadas a los casos de uso.
// No tiene reglas de negocio; solo lee la petición, llama al servicio y responde.
// El usuario llega en req.user.id (middleware currentUser) y los errores
// los responde errorHandler, por eso aquí no hay try/catch.

function makeMoodController(services) {
  return {
    // POST /animo — 201 si es el primer registro del día (+5 XP), 200 si lo actualiza
    registrar: asyncHandler(async (req, res) => {
      const { log, xpAwarded } = await services.registrarEstadoAnimo(req.user.id, req.body);
      res.status(xpAwarded ? 201 : 200).json({ log: toMoodLogDto(log), xpAwarded });
    }),

    // GET /animo/hoy — el registro de hoy o null
    hoy: asyncHandler(async (req, res) => {
      res.json(toMoodLogDto(await services.consultarRegistroHoy(req.user.id)));
    }),

    verRecordatorio: asyncHandler(async (req, res) => {
      res.json(await services.consultarRecordatorio(req.user.id));
    }),

    cambiarRecordatorio: asyncHandler(async (req, res) => {
      res.json(await services.programarRecordatorioAnimo(req.user.id, req.body));
    }),

    tendencia: asyncHandler(async (req, res) => {
      res.json(await services.consultarTendenciaAnimo(req.user.id, req.query.periodo));
    }),

    listarDiario: asyncHandler(async (req, res) => {
      const entries = await services.consultarEntradasDiario(req.user.id);
      res.json(entries.map(toJournalEntryDto));
    }),

    crearEntrada: asyncHandler(async (req, res) => {
      res.status(201).json(toJournalEntryDto(await services.agregarEntradaDiario(req.user.id, req.body)));
    }),

    editarEntrada: asyncHandler(async (req, res) => {
      res.json(toJournalEntryDto(await services.actualizarEntradaDiario(req.user.id, req.params.id, req.body)));
    }),

    borrarEntrada: asyncHandler(async (req, res) => {
      await services.eliminarEntradaDiario(req.user.id, req.params.id);
      res.status(204).end();
    }),
  };
}

module.exports = { makeMoodController };
