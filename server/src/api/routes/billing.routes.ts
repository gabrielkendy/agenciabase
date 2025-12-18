import { Router } from 'express';
import { billingController } from '../controllers/billing.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/auth.middleware.js';
import { billingValidator } from '../validators/billing.validator.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Credits
router.get('/balance', billingController.getBalance);
router.get('/transactions', billingController.getTransactions);

// Plans
router.get('/plans', billingController.getPlans);
router.get('/subscription', billingController.getSubscription);

// Pricing
router.get('/pricing', billingController.getPricing);
router.post('/calculate-cost', billingValidator.calculateCost, billingController.calculateCost);

// Usage
router.get('/usage/daily', billingController.getDailyUsage);

// Admin only - add credits
router.post(
  '/credits/add',
  requireRole(['owner']),
  billingValidator.addCredits,
  billingController.addCredits
);

export default router;
