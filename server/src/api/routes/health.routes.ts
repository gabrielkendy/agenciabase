import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

const router = Router();

// Public health check endpoints
router.get('/', healthController.check);
router.get('/detailed', healthController.detailed);
router.get('/ready', healthController.ready);
router.get('/live', healthController.live);

export default router;
