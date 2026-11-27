const { Router } = require('express');
const { env } = require('../../../../config/env');
const { createRepositories, createNotificationsServices } = require('../../composition');
const { createPushService } = require('../../../../shared/infrastructure/push/pushService');
const { requireUser } = require('../../../../shared/middlewares/requireUser');
const { requireAdmin } = require('../../../../shared/middlewares/requireAdmin');
const { createStickersController } = require('../controllers/stickersController');
const { createInactividadController } = require('../controllers/inactividadController');

// Router de M10, montado en /api/v1/notificaciones.
//
//  GET   /stickers/catalogo          RDF107  catálogo de stickers por categoría
//  POST  /stickers                   RDF108  enviar sticker a uno o varios amigos
//  GET   /stickers/historial         RDF109  enviados y recibidos
//  PATCH /stickers/visto             RDF110  marcar varios (o todos) como vistos
//  PATCH /stickers/:id/visto         RDF110  marcar uno como visto
//  GET   /avisos-inactividad         RDF106  avisos propios y de amigos
//  POST  /inactividad/ejecutar       RDF104+RDF105  revisión manual (ADMIN)
function createNotificationsRouter({ repositories = createRepositories(), push = createPushService(), authenticate } = {}) {
  const services = createNotificationsServices({ repositories, push });
  const stickers = createStickersController(services);
  const inactividad = createInactividadController({ ...services, defaults: env.inactivity });

  const router = Router();
  router.use(authenticate ?? requireUser);

  router.get('/stickers/catalogo', stickers.catalogo);
  router.post('/stickers', stickers.enviar);
  router.get('/stickers/historial', stickers.historial);
  router.patch('/stickers/visto', stickers.marcarVarios);
  router.patch('/stickers/:id/visto', stickers.marcarUno);

  router.get('/avisos-inactividad', inactividad.avisos);
  router.post('/inactividad/ejecutar', requireAdmin(), inactividad.ejecutar);

  return router;
}

module.exports = { createNotificationsRouter };
