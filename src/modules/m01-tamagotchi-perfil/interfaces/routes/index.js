const { Router } = require('express');
const controller = require('../controllers/tamagotchiPerfil.controller');

const router = Router();

// ── Rutas que pide life-rpg-mobile (/usuarios/..., /tamagotchi, /vestidor/...) ──
router.get('/me', controller.getMe);
router.get('/me/cuenta', controller.getAccount);
router.put('/me/cuenta', controller.updateAccount);
router.put('/me/mascota', controller.choosePet);
router.get('/me/puntos', controller.getPoints);
router.get('/me/atributos', controller.getAttributes);
router.get('/me/privacidad', controller.getPrivacy);
router.put('/me/privacidad', controller.updatePrivacy);

router.get('/tamagotchi', controller.getTamagotchi);

router.get('/articulos', controller.getWardrobe);
router.get('/look-actual', controller.getCurrentLook);
router.get('/looks', controller.getSavedLooks);
router.post('/looks', controller.saveLook);
router.patch('/looks/:id/usar', controller.applySavedLook);
router.patch('/articulos/:id', controller.setEquipped);

// ── Rutas originales de prueba (/tamagotchi-perfil/...) ──
router.get('/hud', controller.getTamagotchi);
router.get('/vestidor', controller.getWardrobe);
router.post('/vestidor/looks', controller.saveLook);
router.patch('/vestidor/looks/:outfitId/activar', controller.applySavedLook);
router.patch('/perfil', controller.updateAccount);

module.exports = router;