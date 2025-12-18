import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireSuperAdmin } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication and super admin
router.use(authMiddleware);
router.use(requireSuperAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Organizations
router.get('/organizations', adminController.listOrganizations);
router.get('/organizations/:id', adminController.getOrganization);
router.put('/organizations/:id', adminController.updateOrganization);
router.post('/organizations/:id/credits', adminController.addCredits);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);

// Plans
router.get('/plans', adminController.listPlans);
router.post('/plans', adminController.createPlan);
router.put('/plans/:id', adminController.updatePlan);

// Pricing
router.get('/pricing', adminController.listPricing);
router.put('/pricing/:id', adminController.updatePricing);

// Jobs
router.get('/jobs', adminController.listJobs);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

// Analytics
router.get('/analytics', adminController.getAnalytics);

export default router;
