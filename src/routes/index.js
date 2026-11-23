const { Router } = require("express");
const { createMoodModule } = require("../modules/m06-vitalidad");
const { createHealthRouter } = require("./health");
const { createUsuariosModule } = require("../modules/m00-usuarios-autenticacion");
const {
  createM03Routers,
} = require("../modules/m03-misiones-enfoque/interfaces/routes");

const m01Routes = require("../modules/m01-tamagotchi-perfil/interfaces/routes");
const m01Ctrl = require("../modules/m01-tamagotchi-perfil/interfaces/controllers/tamagotchiPerfil.controller");
const m02Routes = require("../modules/m02-habitos/interfaces/routes");

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case.
function createApiRouter(deps) {
  const router = Router();

  // M00 · Inicio de sesión con Firebase: el token se convierte en req.user en todas las rutas
  const m00 = createUsuariosModule({ now: deps.now });
  router.use(m00.sesion);

  // M06 · Estado de ánimo
  router.use("/animo", createMoodModule({ now: deps.now }).router);

  router.use(["/estado", "/health"], createHealthRouter(deps));

  // M00 · Cuenta del jugador (/usuarios/me/cuenta y /me/mascota). Va antes del M01.
  router.use("/usuarios", m00.router);

  // URLs exactas que consume movil chillon
  router.use("/usuarios", m01Routes);
  router.get("/tamagotchi", m01Ctrl.getTamagotchi);
  router.use("/vestidor", m01Routes);
  router.use("/habitos", m02Routes);

  // alias del módulo pq si no movil llora
  router.use("/tamagotchi-perfil", m01Routes);
  // M03 · Misiones únicas y enfoque
  const m03 = createM03Routers({
    missionRepository: deps.missionRepository,
    now: deps.now,
  });
  router.use("/misiones", m03.misiones);
  router.use("/sesiones", m03.sesiones);

  return router;
}

module.exports = { createApiRouter };
