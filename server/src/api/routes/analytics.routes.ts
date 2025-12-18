import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Only admins and owners can access analytics
router.use(requireRole(['admin', 'owner']));

// Daily usage
router.get('/daily', analyticsController.getDailyUsage);

// User usage
router.get('/users', analyticsController.getUserUsage);

// Provider usage
router.get('/providers', analyticsController.getProviderUsage);

// Model usage
router.get('/models', analyticsController.getModelUsage);

// Summary
router.get('/summary', analyticsController.getSummary);

// Export data
router.get('/export', analyticsController.exportData);

export default router;
