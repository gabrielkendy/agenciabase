import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

interface OrganizationContext {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  settings: Record<string, any>;
  limits: {
    maxUsers: number;
    maxCreditsPerMonth: number;
    maxJobsPerDay: number;
    rateLimit: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      organization?: OrganizationContext;
    }
  }
}

/**
 * Load organization context from user or API key
 */
export async function organizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get organization ID from user or API key
    const organizationId = req.user?.organizationId || req.apiKey?.organizationId;

    if (!organizationId) {
      res.status(401).json({ error: 'Organization context required' });
      return;
    }

    // Fetch organization with plan details
    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        status,
        settings,
        subscriptions!inner (
          plan_id,
          status,
          plans!inner (
            name,
            limits
          )
        )
      `)
      .eq('id', organizationId)
      .eq('subscriptions.status', 'active')
      .single();

    if (error || !org) {
      logger.warn('Organization not found or inactive', { organizationId });
      res.status(403).json({ error: 'Organization not found or inactive' });
      return;
    }

    // Check organization status
    if (org.status !== 'active') {
      res.status(403).json({ error: `Organization is ${org.status}` });
      return;
    }

    // Extract plan info
    const subscription = (org as any).subscriptions?.[0];
    const plan = subscription?.plans;

    // Build organization context
    req.organization = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: plan?.name || 'free',
      status: org.status,
      settings: org.settings || {},
      limits: {
        maxUsers: plan?.limits?.max_users || 5,
        maxCreditsPerMonth: plan?.limits?.max_credits_per_month || 10000,
        maxJobsPerDay: plan?.limits?.max_jobs_per_day || 100,
        rateLimit: plan?.limits?.rate_limit || 60,
      },
    };

    logger.debug('Organization context loaded', {
      organizationId: org.id,
      plan: req.organization.plan,
    });

    next();
  } catch (error) {
    logger.error('Organization middleware error:', error);
    res.status(500).json({ error: 'Failed to load organization context' });
  }
}

/**
 * Require organization to have specific plan
 */
export function requirePlan(allowedPlans: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      res.status(401).json({ error: 'Organization context required' });
      return;
    }

    if (!allowedPlans.includes(req.organization.plan)) {
      res.status(403).json({
        error: `This feature requires one of: ${allowedPlans.join(', ')}`,
        currentPlan: req.organization.plan,
      });
      return;
    }

    next();
  };
}

/**
 * Check if organization has reached a limit
 */
export function checkLimit(limitType: 'users' | 'credits' | 'jobs') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.organization) {
      res.status(401).json({ error: 'Organization context required' });
      return;
    }

    try {
      const orgId = req.organization.id;
      const limits = req.organization.limits;

      if (limitType === 'users') {
        const { count } = await supabase
          .from('memberships')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active');

        if ((count || 0) >= limits.maxUsers) {
          res.status(403).json({
            error: 'User limit reached',
            limit: limits.maxUsers,
            current: count,
          });
          return;
        }
      }

      if (limitType === 'jobs') {
        const today = new Date().toISOString().split('T')[0];
        const { count } = await supabase
          .from('ai_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('created_at', `${today}T00:00:00`);

        if ((count || 0) >= limits.maxJobsPerDay) {
          res.status(429).json({
            error: 'Daily job limit reached',
            limit: limits.maxJobsPerDay,
            current: count,
            resetsAt: `${today}T24:00:00`,
          });
          return;
        }
      }

      if (limitType === 'credits') {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { data } = await supabase
          .from('credit_transactions')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('type', 'debit')
          .gte('created_at', monthStart.toISOString());

        const used = (data || []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

        if (used >= limits.maxCreditsPerMonth) {
          res.status(403).json({
            error: 'Monthly credit limit reached',
            limit: limits.maxCreditsPerMonth,
            used,
          });
          return;
        }
      }

      next();
    } catch (error) {
      logger.error('Check limit error:', error);
      res.status(500).json({ error: 'Failed to check limits' });
    }
  };
}

/**
 * Require organization setting to be enabled
 */
export function requireSetting(settingKey: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.organization) {
      res.status(401).json({ error: 'Organization context required' });
      return;
    }

    const value = req.organization.settings?.[settingKey];

    if (!value) {
      res.status(403).json({
        error: `Feature '${settingKey}' is not enabled for this organization`,
      });
      return;
    }

    next();
  };
}

export default organizationMiddleware;
