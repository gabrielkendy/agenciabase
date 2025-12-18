import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Only admins and owners can manage webhooks
router.use(requireRole(['admin', 'owner']));

// List webhooks
router.get('/', webhookController.list);

// Create webhook
router.post('/', webhookController.create);

// Get webhook
router.get('/:id', webhookController.get);

// Update webhook
router.put('/:id', webhookController.update);

// Delete webhook
router.delete('/:id', webhookController.delete);

// Regenerate secret
router.post('/:id/regenerate-secret', webhookController.regenerateSecret);

// Get deliveries
router.get('/:id/deliveries', webhookController.getDeliveries);

// Test webhook
router.post('/:id/test', webhookController.test);

export default router;
