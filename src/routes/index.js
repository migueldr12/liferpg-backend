const {
  createResumenProgresoRouter,
} = require("../modules/m11-resumen-progreso/interfaces/routes");
const { Router } = require("express");
const { createMoodModule } = require("../modules/m06-vitalidad");
const { createHealthRouter } = require("./health");
const {
  createUsuariosModule,
} = require("../modules/m00-usuarios-autenticacion");
const { createEconomiaModule } = require("../modules/m14-economia-global");
const {
  createM03Routers,
} = require("../modules/m03-misiones-enfoque/interfaces/routes");

const m01Routes = require("../modules/m01-tamagotchi-perfil/interfaces/routes");
const m01Ctrl = require("../modules/m01-tamagotchi-perfil/interfaces/controllers/tamagotchiPerfil.controller");
const m02Routes = require("../modules/m02-habitos/interfaces/routes");
const {
  createAchievementRouter,
  createProgressRouter,
} = require("../modules/m05-logros-progresion/interfaces/routes");
const { createRetosModule } = require("../modules/m12-retos-grupo");

// Router raíz de la API, montado en /api/v1.
// Cada módulo agrega aquí su router desde su propia rama, con el nombre en kebab-case.
function createApiRouter(deps) {
  const router = Router();

  // M00 · Inicio de sesión con Firebase: el token se convierte en req.user en todas las rutas
  const m00 = createUsuariosModule({ now: deps.now });
  router.use(m00.sesion);

  // M06 · Estado de ánimo
  router.use("/animo", createMoodModule({ now: deps.now }).router);

  // M14 · Economía global (PWA Admin, solo ADMIN)
  const m14 = createEconomiaModule({ now: deps.now }).routers;
  router.use("/economia", m14.economia);
  router.use("/catalogo", m14.catalogo);
  router.use("/push", m14.push);

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

  // M05 · Logros (RDF060, RDF063, RDF064) y Tú vs. tú (RF018)
  router.use(
    "/logros",
    createAchievementRouter({
      achievementRepository: deps.achievementRepository,
      now: deps.now,
    }),
  );
  router.use(
    "/progreso",
    createProgressRouter({
      progressRepository: deps.progressRepository,
      now: deps.now,
    }),
  );
  // M12 · Retos y métricas de grupo (PWA Perfil lite)
  router.use("/retos", createRetosModule({ now: deps.now }).router);

  router.use(["/estado", "/health"], createHealthRouter(deps));
  router.use("/resumen-progreso", createResumenProgresoRouter());

  return router;
}

module.exports = { createApiRouter };
