import { Router } from 'express';
import { studioController } from '../controllers/studio.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get available models
router.get('/models', studioController.getModels);

// Generation history
router.get('/history', studioController.getHistory);

// Toggle favorite
router.post('/generations/:id/favorite', studioController.toggleFavorite);

// Get studio stats
router.get('/stats', studioController.getStats);

// Delete generation
router.delete('/generations/:id', studioController.deleteGeneration);

// Bulk delete
router.post('/generations/bulk-delete', studioController.bulkDelete);

export default router;
