import { supabase } from '../../config/database.js';
import { cache } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

interface UsageStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  successRate: number;
  averageProcessingTime: number;
  peakHour: number;
  peakDay: string;
}

interface ProviderStats {
  provider: string;
  jobs: number;
  successRate: number;
  averageTime: number;
  creditsUsed: number;
}

interface HourlyDistribution {
  hour: number;
  jobs: number;
  credits: number;
}

export const usageAnalytics = {
  async getUsageStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageStats> {
    const cacheKey = `usage:stats:${organizationId}:${startDate?.toISOString()}:${endDate?.toISOString()}`;
    const cached = await cache.get<UsageStats>(cacheKey);
    if (cached) return cached;

    let query = supabase
      .from('ai_jobs')
      .select('status, created_at, completed_at')
      .eq('organization_id', organizationId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }

    const jobs = data || [];
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Calculate average processing time
    const processingTimes = jobs
      .filter(j => j.completed_at && j.created_at)
      .map(j => new Date(j.completed_at).getTime() - new Date(j.created_at).getTime());

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000 // in seconds
      : 0;

    // Find peak hour
    const hourCounts: Record<number, number> = {};
    for (const job of jobs) {
      const hour = new Date(job.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '0';

    // Find peak day
    const dayCounts: Record<string, number> = {};
    for (const job of jobs) {
      const day = new Date(job.created_at).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    }
    const peakDay = Object.entries(dayCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Monday';

    const stats: UsageStats = {
      totalJobs,
      completedJobs,
      failedJobs,
      successRate: Math.round(successRate * 100) / 100,
      averageProcessingTime: Math.round(averageProcessingTime * 100) / 100,
      peakHour: parseInt(peakHour),
      peakDay,
    };

    await cache.set(cacheKey, stats, 300);
    return stats;
  },

  async getProviderStats(organizationId: string): Promise<ProviderStats[]> {
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('provider, status, created_at, completed_at, credits_used')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to get provider stats: ${error.message}`);
    }

    const byProvider: Record<string, {
      jobs: number;
      completed: number;
      times: number[];
      credits: number;
    }> = {};

    for (const job of data || []) {
      const provider = job.provider || 'unknown';
      if (!byProvider[provider]) {
        byProvider[provider] = { jobs: 0, completed: 0, times: [], credits: 0 };
      }

      byProvider[provider].jobs++;
      if (job.status === 'completed') {
        byProvider[provider].completed++;
      }
      if (job.completed_at && job.created_at) {
        const time = new Date(job.completed_at).getTime() - new Date(job.created_at).getTime();
        byProvider[provider].times.push(time / 1000);
      }
      byProvider[provider].credits += job.credits_used || 0;
    }

    return Object.entries(byProvider).map(([provider, stats]) => ({
      provider,
      jobs: stats.jobs,
      successRate: stats.jobs > 0 ? Math.round((stats.completed / stats.jobs) * 10000) / 100 : 0,
      averageTime: stats.times.length > 0
        ? Math.round((stats.times.reduce((a, b) => a + b, 0) / stats.times.length) * 100) / 100
        : 0,
      creditsUsed: stats.credits,
    }));
  },

  async getHourlyDistribution(
    organizationId: string,
    days: number = 7
  ): Promise<HourlyDistribution[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('ai_jobs')
      .select('created_at, credits_used')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString());

    if (error) {
      throw new Error(`Failed to get hourly distribution: ${error.message}`);
    }

    const hourly: Record<number, { jobs: number; credits: number }> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourly[i] = { jobs: 0, credits: 0 };
    }

    for (const job of data || []) {
      const hour = new Date(job.created_at).getHours();
      hourly[hour].jobs++;
      hourly[hour].credits += job.credits_used || 0;
    }

    return Object.entries(hourly).map(([hour, stats]) => ({
      hour: parseInt(hour),
      ...stats,
    }));
  },

  async getModelUsage(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{ model: string; jobs: number; credits: number; percentage: number }>> {
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
      throw new Error(`Failed to get model usage: ${error.message}`);
    }

    const byModel: Record<string, { jobs: number; credits: number }> = {};
    let totalCredits = 0;

    for (const row of data || []) {
      const model = row.model || 'unknown';
      if (!byModel[model]) {
        byModel[model] = { jobs: 0, credits: 0 };
      }
      byModel[model].jobs++;
      byModel[model].credits += row.credits_used || 0;
      totalCredits += row.credits_used || 0;
    }

    return Object.entries(byModel)
      .map(([model, stats]) => ({
        model,
        jobs: stats.jobs,
        credits: stats.credits,
        percentage: totalCredits > 0 ? Math.round((stats.credits / totalCredits) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.credits - a.credits);
  },

  async getRecentActivity(
    organizationId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    type: string;
    provider: string;
    model: string;
    status: string;
    credits: number;
    createdAt: string;
    completedAt?: string;
  }>> {
    const { data, error } = await supabase
      .from('ai_jobs')
      .select('id, type, provider, model, status, credits_used, created_at, completed_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent activity: ${error.message}`);
    }

    return (data || []).map(job => ({
      id: job.id,
      type: job.type,
      provider: job.provider,
      model: job.model,
      status: job.status,
      credits: job.credits_used || 0,
      createdAt: job.created_at,
      completedAt: job.completed_at,
    }));
  },
};

export default usageAnalytics;
