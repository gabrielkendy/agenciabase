import { supabase } from '../../config/database.js';
import { cache } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

interface CostBreakdown {
  provider: string;
  model: string;
  totalCost: number;
  totalCredits: number;
  jobCount: number;
  averageCostPerJob: number;
}

interface CostTrend {
  date: string;
  cost: number;
  credits: number;
  jobs: number;
}

interface CostProjection {
  currentMonth: number;
  projectedMonth: number;
  dailyAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export const costAnalytics = {
  async getCostBreakdown(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CostBreakdown[]> {
    const cacheKey = `cost:breakdown:${organizationId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
    const cached = await cache.get<CostBreakdown[]>(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('generations')
      .select('provider, model, credits_used')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get cost breakdown: ${error.message}`);
    }

    // Aggregate by provider and model
    const breakdown: Record<string, CostBreakdown> = {};

    for (const row of data || []) {
      const key = `${row.provider}:${row.model}`;
      if (!breakdown[key]) {
        breakdown[key] = {
          provider: row.provider,
          model: row.model,
          totalCost: 0,
          totalCredits: 0,
          jobCount: 0,
          averageCostPerJob: 0,
        };
      }

      const credits = row.credits_used || 0;
      breakdown[key].totalCredits += credits;
      breakdown[key].totalCost += credits * 0.01; // Assuming $0.01 per credit
      breakdown[key].jobCount += 1;
    }

    // Calculate averages
    const result = Object.values(breakdown).map(item => ({
      ...item,
      averageCostPerJob: item.jobCount > 0 ? item.totalCost / item.jobCount : 0,
    }));

    result.sort((a, b) => b.totalCost - a.totalCost);

    await cache.set(cacheKey, result, 300);
    return result;
  },

  async getCostTrends(
    organizationId: string,
    days: number = 30
  ): Promise<CostTrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('usage_daily')
      .select('date, total_credits, total_jobs')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get cost trends: ${error.message}`);
    }

    return (data || []).map(row => ({
      date: row.date,
      cost: (row.total_credits || 0) * 0.01,
      credits: row.total_credits || 0,
      jobs: row.total_jobs || 0,
    }));
  },

  async getCostProjection(organizationId: string): Promise<CostProjection> {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    // Get this month's usage
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = await supabase
      .from('usage_daily')
      .select('total_credits')
      .eq('organization_id', organizationId)
      .gte('date', monthStart.toISOString().split('T')[0]);

    const currentMonthCredits = (data || []).reduce((sum, row) => sum + (row.total_credits || 0), 0);
    const dailyAverage = daysPassed > 0 ? currentMonthCredits / daysPassed : 0;
    const projectedCredits = currentMonthCredits + (dailyAverage * daysRemaining);

    // Get last 7 days trend
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentData } = await supabase
      .from('usage_daily')
      .select('date, total_credits')
      .eq('organization_id', organizationId)
      .gte('date', weekAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

    if (recentData && recentData.length >= 3) {
      const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
      const secondHalf = recentData.slice(Math.floor(recentData.length / 2));

      const firstAvg = firstHalf.reduce((sum, r) => sum + (r.total_credits || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + (r.total_credits || 0), 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) {
        trend = 'increasing';
      } else if (secondAvg < firstAvg * 0.9) {
        trend = 'decreasing';
      }
    }

    return {
      currentMonth: currentMonthCredits * 0.01,
      projectedMonth: projectedCredits * 0.01,
      dailyAverage: dailyAverage * 0.01,
      trend,
    };
  },

  async getTopSpenders(
    organizationId: string,
    limit: number = 10
  ): Promise<Array<{ userId: string; userName: string; credits: number; cost: number }>> {
    const { data, error } = await supabase
      .from('usage_by_user')
      .select(`
        user_id,
        total_credits,
        users!inner(name)
      `)
      .eq('organization_id', organizationId)
      .order('total_credits', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get top spenders: ${error.message}`);
    }

    return (data || []).map(row => ({
      userId: row.user_id,
      userName: (row as any).users?.name || 'Unknown',
      credits: row.total_credits || 0,
      cost: (row.total_credits || 0) * 0.01,
    }));
  },

  async getCostByType(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, { credits: number; cost: number; percentage: number }>> {
    let query = supabase
      .from('generations')
      .select('type, credits_used')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get cost by type: ${error.message}`);
    }

    const byType: Record<string, number> = {};
    let total = 0;

    for (const row of data || []) {
      const type = row.type || 'unknown';
      byType[type] = (byType[type] || 0) + (row.credits_used || 0);
      total += row.credits_used || 0;
    }

    const result: Record<string, { credits: number; cost: number; percentage: number }> = {};

    for (const [type, credits] of Object.entries(byType)) {
      result[type] = {
        credits,
        cost: credits * 0.01,
        percentage: total > 0 ? (credits / total) * 100 : 0,
      };
    }

    return result;
  },
};

export default costAnalytics;
