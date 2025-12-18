import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import { creditsService } from '../../services/billing/credits.service.js';

export const adminController = {
  /**
   * Dashboard stats
   */
  async getDashboard(req: Request, res: Response) {
    try {
      // Total organizations
      const { count: totalOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Total jobs today
      const today = new Date().toISOString().split('T')[0];
      const { count: todayJobs } = await supabase
        .from('ai_jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Total credits consumed today
      const { data: todayCredits } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('type', 'debit')
        .gte('created_at', today);

      const creditsConsumedToday = todayCredits?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Revenue (sum of credit transactions)
      const { data: revenueData } = await supabase
        .from('credit_transactions')
        .select('amount')
        .eq('type', 'credit')
        .neq('description', 'Initial balance');

      const totalRevenue = revenueData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      res.json({
        success: true,
        data: {
          totalOrganizations: totalOrgs || 0,
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubscriptions || 0,
          todayJobs: todayJobs || 0,
          creditsConsumedToday,
          totalRevenue,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * List all organizations
   */
  async listOrganizations(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, plan } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('organizations')
        .select(`
          *,
          subscriptions(plan_id, status),
          users(count)
        `, { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get organization details
   */
  async getOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data: org, error } = await supabase
        .from('organizations')
        .select(`
          *,
          subscriptions(*),
          credit_balances(*),
          users(id, email, name, role, is_active)
        `)
        .eq('id', id)
        .single();

      if (error || !org) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get usage stats
      const { data: usageStats } = await supabase
        .from('usage_daily')
        .select('*')
        .eq('organization_id', id)
        .order('date', { ascending: false })
        .limit(30);

      res.json({
        success: true,
        data: {
          ...org,
          usageStats,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Update organization
   */
  async updateOrganization(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, settings, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (settings) updateData.settings = settings;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Add credits to organization
   */
  async addCredits(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      const result = await creditsService.credit({
        organizationId: id,
        amount,
        type: 'adjustment',
        description: description || 'Admin credit addition',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * List all users
   */
  async listUsers(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, role, organization_id } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('users')
        .select(`
          *,
          organizations(id, name, slug)
        `, { count: 'exact' });

      if (search) {
        query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
      }

      if (role) {
        query = query.eq('role', role);
      }

      if (organization_id) {
        query = query.eq('organization_id', organization_id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get user details
   */
  async getUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const { data: user, error } = await supabase
        .from('users')
        .select(`
          *,
          organizations(id, name, slug)
        `)
        .eq('id', id)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's usage stats
      const { data: usageStats } = await supabase
        .from('usage_by_user')
        .select('*')
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(30);

      res.json({
        success: true,
        data: {
          ...user,
          usageStats,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Update user
   */
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, role, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * List all plans
   */
  async listPlans(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Create plan
   */
  async createPlan(req: Request, res: Response) {
    try {
      const { name, slug, features, limits, price_monthly, price_yearly, credits_monthly } = req.body;

      const { data, error } = await supabase
        .from('plans')
        .insert({
          name,
          slug,
          features,
          limits,
          price_monthly,
          price_yearly,
          credits_monthly,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Update plan
   */
  async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, features, limits, price_monthly, price_yearly, credits_monthly, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (features) updateData.features = features;
      if (limits) updateData.limits = limits;
      if (price_monthly !== undefined) updateData.price_monthly = price_monthly;
      if (price_yearly !== undefined) updateData.price_yearly = price_yearly;
      if (credits_monthly !== undefined) updateData.credits_monthly = credits_monthly;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('plans')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * List pricing
   */
  async listPricing(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .order('provider', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Update pricing
   */
  async updatePricing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { credits_cost, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (credits_cost !== undefined) updateData.credits_cost = credits_cost;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('pricing')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get all jobs
   */
  async listJobs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, status, provider, organization_id } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('ai_jobs')
        .select(`
          *,
          organizations(id, name)
        `, { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }

      if (provider) {
        query = query.eq('provider', provider);
      }

      if (organization_id) {
        query = query.eq('organization_id', organization_id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get audit logs
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, action, user_id, organization_id } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      if (action) {
        query = query.eq('action', action);
      }

      if (user_id) {
        query = query.eq('user_id', user_id);
      }

      if (organization_id) {
        query = query.eq('organization_id', organization_id);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + Number(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get system analytics
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const { period = '30d' } = req.query;

      // Calculate date range
      const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Daily usage
      const { data: dailyUsage } = await supabase
        .from('usage_daily')
        .select('date, total_jobs, total_credits')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Aggregate by date
      const usageByDate: Record<string, { jobs: number; credits: number }> = {};
      dailyUsage?.forEach((row) => {
        if (!usageByDate[row.date]) {
          usageByDate[row.date] = { jobs: 0, credits: 0 };
        }
        usageByDate[row.date].jobs += row.total_jobs;
        usageByDate[row.date].credits += row.total_credits;
      });

      // Provider usage
      const { data: providerUsage } = await supabase
        .from('ai_jobs')
        .select('provider')
        .gte('created_at', startDate.toISOString());

      const providerCounts: Record<string, number> = {};
      providerUsage?.forEach((row) => {
        providerCounts[row.provider] = (providerCounts[row.provider] || 0) + 1;
      });

      // New signups
      const { count: newOrgs } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const { count: newUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      res.json({
        success: true,
        data: {
          usageByDate: Object.entries(usageByDate).map(([date, data]) => ({
            date,
            ...data,
          })),
          providerUsage: Object.entries(providerCounts).map(([provider, count]) => ({
            provider,
            count,
          })),
          newOrganizations: newOrgs || 0,
          newUsers: newUsers || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default adminController;
