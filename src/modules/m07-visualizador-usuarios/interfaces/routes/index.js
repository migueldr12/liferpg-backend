const { Router } = require('express');
const controller = require('../controllers/visualizador.controller');
const { validateObjectIdParam, validatePartyQuery } = require('../validators/visualizador.validator');

const router = Router();

// RF022 · Lista de Usuarios ("Tu Party")
router.get('/party', validatePartyQuery, controller.getParty);
router.delete('/party/:friendId', validateObjectIdParam('friendId'), controller.removeFriend);

// RF023 · Perfil Espejo (solo lectura)
router.get('/perfil-espejo/:friendId', validateObjectIdParam('friendId'), controller.getPerfilEspejo);

// RF024 · Gestor de Códigos de Amistad
router.get('/codigos', controller.listCodigos);
router.post('/codigos', controller.createCodigo);
router.patch('/codigos/:codeId/revocar', validateObjectIdParam('codeId'), controller.revokeCodigo);
router.post('/codigos/canjear', controller.redeemCodigo);

module.exports = router;