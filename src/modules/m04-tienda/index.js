const { env } = require('../../config/env');
const { currentUser } = require('../../shared/middlewares/currentUser');
const { getPrisma } = require('../../shared/infrastructure/database/prisma');
const { PrismaTiendaRepository } = require('./infrastructure/repositories/PrismaTiendaRepository');
const {
  makeConsultarArticulos,
  makeComprarArticulo,
  makeConsultarPrecioSugerido,
  makeCrearRecompensa,
  makeConsultarRecompensa,
  makeActualizarRecompensa,
  makeEliminarRecompensa,
} = require('./application/services/tienda');
const {
  makeConsultarInventario,
  makeCanjearRecompensa,
  makeUsarConsumible,
  makeAlternarRopa,
  makeConsultarCanjes,
} = require('./application/services/inventario');
const { makeTiendaController } = require('./interfaces/controllers/tiendaController');
const { makeTiendaRouters } = require('./interfaces/routes');

// Punto de entrada del M04 (Tienda e inventario). El router raíz monta:
//   /api/v1/tienda      · escaparate, compras y recompensas personalizadas
//   /api/v1/inventario  · inventario, canjes, consumibles y ropa
//
// - repository: MongoDB con Prisma por defecto; las pruebas pasan el falso.
// - economyService: M14, de donde salen el rango de precio (RDF054) y la economía activa.
//   El router raíz le pasa el del módulo ya creado; si no, se arma aquí.

function createTiendaModule({
  repository = new PrismaTiendaRepository({ db: getPrisma }),
  economyService,
  devUserId = env.devUserId ?? process.env.DEV_USER_ID ?? null,
} = {}) {
  // Se pide al cargar el módulo para no repetir la instancia del M14 en el router raíz.
  if (!economyService) {
    // require diferido: el M14 no depende del M04, así se evita un ciclo al arrancar.
    const { createEconomiaModule } = require('../m14-economia-global');
    economyService = createEconomiaModule({ devUserId }).services;
  }

  const deps = { repository, economyService };

  const services = {
    consultarArticulos: makeConsultarArticulos(deps),
    comprarArticulo: makeComprarArticulo(deps),
    consultarPrecioSugerido: makeConsultarPrecioSugerido(deps),
    crearRecompensa: makeCrearRecompensa(deps),
    consultarRecompensa: makeConsultarRecompensa(deps),
    actualizarRecompensa: makeActualizarRecompensa(deps),
    eliminarRecompensa: makeEliminarRecompensa(deps),
    consultarInventario: makeConsultarInventario(deps),
    canjearRecompensa: makeCanjearRecompensa(deps),
    usarConsumible: makeUsarConsumible(deps),
    alternarRopa: makeAlternarRopa(deps),
    consultarCanjes: makeConsultarCanjes(deps),
  };

  const auth = currentUser({
    allowDevHeader: env.allowDevAuth ?? env.nodeEnv !== 'production',
    devUserId,
  });

  return { services, routers: makeTiendaRouters(makeTiendaController(services), { auth }) };
}

module.exports = { createTiendaModule };
