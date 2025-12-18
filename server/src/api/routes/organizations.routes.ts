import { Router } from 'express';
import { organizationsController } from '../controllers/organizations.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get current organization
router.get('/current', organizationsController.get);

// Update organization (admin/owner only)
router.put('/current', requireRole(['admin', 'owner']), organizationsController.update);

// Get organization members
router.get('/current/members', organizationsController.getMembers);

// Get organization stats
router.get('/current/stats', organizationsController.getStats);

// API Keys management (admin/owner only)
router.get('/current/api-keys', requireRole(['admin', 'owner']), organizationsController.getApiKeys);
router.post('/current/api-keys', requireRole(['admin', 'owner']), organizationsController.createApiKey);
router.delete('/current/api-keys/:keyId', requireRole(['admin', 'owner']), organizationsController.deleteApiKey);

// Provider API Keys (owner only)
router.get('/current/provider-keys', requireRole(['owner']), organizationsController.getProviderKeys);
router.post('/current/provider-keys', requireRole(['owner']), organizationsController.createProviderKey);
router.delete('/current/provider-keys/:keyId', requireRole(['owner']), organizationsController.deleteProviderKey);

export default router;
