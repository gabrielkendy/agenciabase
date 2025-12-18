import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

interface UsageRecord {
  organizationId: string;
  userId: string;
  provider: string;
  model: string;
  operation: string;
  creditsUsed: number;
  metadata?: Record<string, any>;
}

interface DailyUsage {
  date: string;
  totalCredits: number;
  totalJobs: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
}

interface UserUsage {
  userId: string;
  userName: string;
  totalCredits: number;
  totalJobs: number;
  lastActivity: string;
}

export const usageService = {
  async trackUsage(record: UsageRecord): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Update daily usage
      const { error: dailyError } = await supabase.rpc('increment_daily_usage', {
        p_organization_id: record.organizationId,
        p_date: today,
        p_provider: record.provider,
        p_model: record.model,
        p_credits: record.creditsUsed,
      });

      if (dailyError) {
        // Fallback: insert or update manually
        await supabase.from('usage_daily').upsert({
          organization_id: record.organizationId,
          date: today,
          total_credits: record.creditsUsed,
          total_jobs: 1,
          by_provider: { [record.provider]: record.creditsUsed },
          by_model: { [record.model]: record.creditsUsed },
        }, {
          onConflict: 'organization_id,date',
        });
      }

      // Update user usage
      await supabase.from('usage_by_user').upsert({
        organization_id: record.organizationId,
        user_id: record.userId,
        total_credits: record.creditsUsed,
        total_jobs: 1,
        last_activity: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,user_id',
      });

      logger.debug('Usage tracked', { record });
    } catch (error) {
      logger.error('Failed to track usage:', error);
    }
  },

  async getDailyUsage(
    organizationId: string,
    days: number = 30
  ): Promise<DailyUsage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('usage_daily')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get daily usage: ${error.message}`);
    }

    return (data || []).map(row => ({
      date: row.date,
      totalCredits: row.total_credits || 0,
      totalJobs: row.total_jobs || 0,
      byProvider: row.by_provider || {},
      byModel: row.by_model || {},
    }));
  },

  async getUserUsage(organizationId: string): Promise<UserUsage[]> {
    const { data, error } = await supabase
      .from('usage_by_user')
      .select(`
        user_id,
        total_credits,
        total_jobs,
        last_activity,
        users!inner(name)
      `)
      .eq('organization_id', organizationId)
      .order('total_credits', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user usage: ${error.message}`);
    }

    return (data || []).map(row => ({
      userId: row.user_id,
      userName: (row as any).users?.name || 'Unknown',
      totalCredits: row.total_credits || 0,
      totalJobs: row.total_jobs || 0,
      lastActivity: row.last_activity,
    }));
  },

  async getProviderBreakdown(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, { credits: number; jobs: number }>> {
    let query = supabase
      .from('generations')
      .select('provider, credits_used')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get provider breakdown: ${error.message}`);
    }

    const breakdown: Record<string, { credits: number; jobs: number }> = {};

    for (const row of data || []) {
      if (!breakdown[row.provider]) {
        breakdown[row.provider] = { credits: 0, jobs: 0 };
      }
      breakdown[row.provider].credits += row.credits_used || 0;
      breakdown[row.provider].jobs += 1;
    }

    return breakdown;
  },

  async getModelBreakdown(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, { credits: number; jobs: number }>> {
    let query = supabase
      .from('generations')
      .select('model, credits_used')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get model breakdown: ${error.message}`);
    }

    const breakdown: Record<string, { credits: number; jobs: number }> = {};

    for (const row of data || []) {
      if (!breakdown[row.model]) {
        breakdown[row.model] = { credits: 0, jobs: 0 };
      }
      breakdown[row.model].credits += row.credits_used || 0;
      breakdown[row.model].jobs += 1;
    }

    return breakdown;
  },

  async getSummary(organizationId: string): Promise<{
    totalCreditsUsed: number;
    totalJobs: number;
    todayCredits: number;
    todayJobs: number;
    thisMonthCredits: number;
    thisMonthJobs: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);

    // Get today's usage
    const { data: todayData } = await supabase
      .from('usage_daily')
      .select('total_credits, total_jobs')
      .eq('organization_id', organizationId)
      .eq('date', today)
      .single();

    // Get this month's usage
    const { data: monthData } = await supabase
      .from('usage_daily')
      .select('total_credits, total_jobs')
      .eq('organization_id', organizationId)
      .gte('date', monthStart.toISOString().split('T')[0]);

    // Get all-time usage
    const { data: allTimeData } = await supabase
      .from('usage_daily')
      .select('total_credits, total_jobs')
      .eq('organization_id', organizationId);

    const sumArray = (arr: any[] | null, field: string) =>
      (arr || []).reduce((sum, row) => sum + (row[field] || 0), 0);

    return {
      totalCreditsUsed: sumArray(allTimeData, 'total_credits'),
      totalJobs: sumArray(allTimeData, 'total_jobs'),
      todayCredits: todayData?.total_credits || 0,
      todayJobs: todayData?.total_jobs || 0,
      thisMonthCredits: sumArray(monthData, 'total_credits'),
      thisMonthJobs: sumArray(monthData, 'total_jobs'),
    };
  },
};

export default usageService;
