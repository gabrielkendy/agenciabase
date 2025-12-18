import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { authValidator } from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', authValidator.register, authController.register);
router.post('/login', authValidator.login, authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', authValidator.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidator.resetPassword, authController.resetPassword);

// Protected routes
router.use(authMiddleware);
router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.put('/change-password', authValidator.changePassword, authController.changePassword);

export default router;
