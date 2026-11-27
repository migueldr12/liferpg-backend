const { Router } = require('express');
const { requireUser } = require('../../../../shared/middlewares/requireUser');
const { requireAdmin } = require('../../../../shared/middlewares/requireAdmin');
const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { createProfileExportRepository } = require('../../infrastructure/repositories/profileExportRepository');
const { createProfileExportService } = require('../../application/services/profileExportService');

function createDataRouter({ service = createProfileExportService(createProfileExportRepository()), auth = requireUser, admin = requireAdmin() } = {}) {
  const router = Router();
  router.use(auth, admin);
  router.get('/profiles', asyncHandler(async (req, res) => res.json(await service.listProfiles())));
  router.post('/exports', asyncHandler(async (req, res) => {
    const data = await service.exportProfiles(req.body);
    res.set('Cache-Control', 'no-store');
    res.attachment('liferpg-perfiles.json').json(data);
  }));
  return router;
}

module.exports = { createDataRouter };
