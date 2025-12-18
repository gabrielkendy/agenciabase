import { supabase } from '../../config/database.js';
import { cache } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

interface MetricsSummary {
  organizations: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  jobs: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  credits: {
    totalUsed: number;
    totalPurchased: number;
    averagePerOrg: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
}

interface TimeSeriesData {
  date: string;
  value: number;
}

export const metricsService = {
  async getGlobalMetrics(): Promise<MetricsSummary> {
    const cacheKey = 'metrics:global';
    const cached = await cache.get<MetricsSummary>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Organizations
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const { count: activeOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: newOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString());

    // Users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString());

    // Jobs
    const { count: totalJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true });

    const { count: completedJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: failedJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed');

    const { count: pendingJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);

    // Credits
    const { data: creditData } = await supabase
      .from('credit_transactions')
      .select('type, amount');

    const totalUsed = (creditData || [])
      .filter(t => t.type === 'debit' || t.type === 'usage')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalPurchased = (creditData || [])
      .filter(t => t.type === 'credit' || t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    // Revenue (simplified - from invoices)
    const { data: thisMonthInvoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', monthStart.toISOString());

    const { data: lastMonthInvoices } = await supabase
      .from('invoices')
      .select('total')
      .eq('status', 'paid')
      .gte('paid_at', lastMonthStart.toISOString())
      .lte('paid_at', lastMonthEnd.toISOString());

    const thisMonthRevenue = (thisMonthInvoices || []).reduce((sum, i) => sum + i.total, 0);
    const lastMonthRevenue = (lastMonthInvoices || []).reduce((sum, i) => sum + i.total, 0);
    const growth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    const metrics: MetricsSummary = {
      organizations: {
        total: totalOrgs || 0,
        active: activeOrgs || 0,
        newThisMonth: newOrgs || 0,
      },
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        newThisMonth: newUsers || 0,
      },
      jobs: {
        total: totalJobs || 0,
        completed: completedJobs || 0,
        failed: failedJobs || 0,
        pending: pendingJobs || 0,
      },
      credits: {
        totalUsed,
        totalPurchased,
        averagePerOrg: totalOrgs ? Math.round(totalUsed / totalOrgs) : 0,
      },
      revenue: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: Math.round(growth * 100) / 100,
      },
    };

    await cache.set(cacheKey, metrics, 300); // Cache 5 minutes
    return metrics;
  },

  async getOrganizationMetrics(organizationId: string): Promise<{
    jobs: { total: number; completed: number; failed: number };
    credits: { balance: number; used: number; purchased: number };
    users: { total: number; active: number };
  }> {
    const cacheKey = `metrics:org:${organizationId}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    // Jobs
    const { count: totalJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: completedJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed');

    const { count: failedJobs } = await supabase
      .from('ai_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'failed');

    // Credits
    const { data: balanceData } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('organization_id', organizationId)
      .single();

    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('type, amount')
      .eq('organization_id', organizationId);

    const used = (transactions || [])
      .filter(t => t.type === 'debit' || t.type === 'usage')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const purchased = (transactions || [])
      .filter(t => t.type === 'credit' || t.type === 'purchase')
      .reduce((sum, t) => sum + t.amount, 0);

    // Users
    const { count: totalUsers } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { count: activeUsers } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    const metrics = {
      jobs: {
        total: totalJobs || 0,
        completed: completedJobs || 0,
        failed: failedJobs || 0,
      },
      credits: {
        balance: balanceData?.balance || 0,
        used,
        purchased,
      },
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
      },
    };

    await cache.set(cacheKey, metrics, 60); // Cache 1 minute
    return metrics;
  },

  async getTimeSeries(
    metric: 'jobs' | 'credits' | 'users',
    organizationId?: string,
    days: number = 30
  ): Promise<TimeSeriesData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let data: TimeSeriesData[] = [];

    if (metric === 'jobs') {
      let query = supabase
        .from('ai_jobs')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: jobs } = await query;
      data = this.aggregateByDate(jobs || [], 'created_at', days);
    } else if (metric === 'credits') {
      let query = supabase
        .from('credit_transactions')
        .select('created_at, amount, type')
        .eq('type', 'debit')
        .gte('created_at', startDate.toISOString());

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data: transactions } = await query;
      data = this.aggregateByDateWithSum(transactions || [], 'created_at', 'amount', days);
    } else if (metric === 'users') {
      let query = supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      const { data: users } = await query;
      data = this.aggregateByDate(users || [], 'created_at', days);
    }

    return data;
  },

  aggregateByDate(items: any[], dateField: string, days: number): TimeSeriesData[] {
    const result: Record<string, number> = {};

    // Initialize all dates
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result[date.toISOString().split('T')[0]] = 0;
    }

    // Count items
    for (const item of items) {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (result[date] !== undefined) {
        result[date]++;
      }
    }

    return Object.entries(result)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  aggregateByDateWithSum(items: any[], dateField: string, valueField: string, days: number): TimeSeriesData[] {
    const result: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result[date.toISOString().split('T')[0]] = 0;
    }

    for (const item of items) {
      const date = new Date(item[dateField]).toISOString().split('T')[0];
      if (result[date] !== undefined) {
        result[date] += Math.abs(item[valueField] || 0);
      }
    }

    return Object.entries(result)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
};

export default metricsService;
