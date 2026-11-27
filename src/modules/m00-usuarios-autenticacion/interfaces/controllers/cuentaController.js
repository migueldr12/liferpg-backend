const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { toAccountDto } = require('../../application/dtos/cuentaDtos');

// Controlador del M00: cuenta del juego del usuario de la sesión (req.user.id).

function makeCuentaController(services) {
  return {
    sesion: asyncHandler(async (req, res) => {
      res.json(await services.consultarSesion(req.user.id));
    }),

    ver: asyncHandler(async (req, res) => {
      res.json(toAccountDto(await services.consultarCuenta(req.user.id)));
    }),

    crear: asyncHandler(async (req, res) => {
      res.status(201).json(toAccountDto(await services.crearCuenta(req.user.id, req.body)));
    }),

    editar: asyncHandler(async (req, res) => {
      res.json(toAccountDto(await services.actualizarCuenta(req.user.id, req.body)));
    }),

    mascota: asyncHandler(async (req, res) => {
      res.json(toAccountDto(await services.elegirMascota(req.user.id, req.body.pet)));
    }),
  };
}

module.exports = { makeCuentaController };
