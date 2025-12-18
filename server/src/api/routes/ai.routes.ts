import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { billingMiddleware } from '../../middleware/billing.middleware.js';
import { rateLimitMiddleware } from '../../middleware/rateLimit.middleware.js';
import { aiValidator } from '../validators/ai.validator.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitMiddleware);

// Image generation
router.post(
  '/image/generate',
  billingMiddleware,
  aiValidator.generateImage,
  aiController.generateImage
);

router.post(
  '/image/generate-async',
  billingMiddleware,
  aiValidator.generateImage,
  aiController.generateImageAsync
);

// Video generation
router.post(
  '/video/generate',
  billingMiddleware,
  aiValidator.generateVideo,
  aiController.generateVideo
);

// Job status
router.get('/jobs/:jobId', aiController.getJobStatus);

// Generations
router.get('/generations', aiController.listGenerations);
router.get('/generations/:id', aiController.getGeneration);
router.delete('/generations/:id', aiController.deleteGeneration);

export default router;
