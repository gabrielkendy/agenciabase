import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List users (admin/owner only)
router.get('/', requireRole(['admin', 'owner']), usersController.list);

// Get user by ID
router.get('/:id', usersController.get);

// Update user
router.put('/:id', usersController.update);

// Invite user (admin/owner only)
router.post('/invite', requireRole(['admin', 'owner']), usersController.invite);

// Deactivate user (admin/owner only)
router.post('/:id/deactivate', requireRole(['admin', 'owner']), usersController.deactivate);

// Activate user (admin/owner only)
router.post('/:id/activate', requireRole(['admin', 'owner']), usersController.activate);

// Delete user (owner only)
router.delete('/:id', requireRole(['owner']), usersController.delete);

export default router;
