import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import organizationsRoutes from './organizations.routes.js';
import aiRoutes from './ai.routes.js';
import studioRoutes from './studio.routes.js';
import billingRoutes from './billing.routes.js';
import analyticsRoutes from './analytics.routes.js';
import webhooksRoutes from './webhooks.routes.js';
import adminRoutes from './admin.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

// Public routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);

// Protected routes
router.use('/users', usersRoutes);
router.use('/organizations', organizationsRoutes);
router.use('/ai', aiRoutes);
router.use('/studio', studioRoutes);
router.use('/billing', billingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/admin', adminRoutes);

export default router;
