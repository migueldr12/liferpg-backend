const { Router } = require('express');
const { requireUser } = require('../../../../shared/middlewares/requireUser');
const { requireAdmin } = require('../../../../shared/middlewares/requireAdmin');
const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const { createHostRepository } = require('../../infrastructure/repositories/hostRepository');
const { listRequests } = require('../../infrastructure/requestEvents');

function createHostRouter({ repository = createHostRepository(), auth = requireUser, admin = requireAdmin(), requests = listRequests } = {}) {
  const router = Router();
  router.use(auth, admin);
  router.get('/clients', asyncHandler(async (req, res) => res.json(await repository.listDevices())));
  router.get('/logs', (req, res) => res.json(requests()));
  return router;
}

module.exports = { createHostRouter };
