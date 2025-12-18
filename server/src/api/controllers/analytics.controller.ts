import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import { creditsService } from '../../services/billing/credits.service.js';

export const analyticsController = {
  /**
   * Obter uso diário
   */
  async getDailyUsage(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const { data, error } = await supabase
        .from('usage_daily')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

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
   * Obter uso por usuário
   */
  async getUserUsage(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const { data, error } = await supabase
        .from('usage_by_user')
        .select(`
          *,
          users (id, name, email, avatar_url)
        `)
        .eq('organization_id', organizationId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('credits_used', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      // Agrupar por usuário
      const byUser: Record<string, any> = {};
      data?.forEach(row => {
        const userId = row.user_id;
        if (!byUser[userId]) {
          byUser[userId] = {
            user: row.users,
            totalImages: 0,
            totalVideos: 0,
            totalAudio: 0,
            totalCredits: 0,
          };
        }
        byUser[userId].totalImages += row.images_generated;
        byUser[userId].totalVideos += row.videos_generated;
        byUser[userId].totalAudio += row.audio_generated;
        byUser[userId].totalCredits += row.credits_used;
      });

      res.json({
        success: true,
        data: Object.values(byUser).sort((a, b) => b.totalCredits - a.totalCredits),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter uso por provider
   */
  async getProviderUsage(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const { data, error } = await supabase
        .from('generations')
        .select('provider, credits_used, cost_usd')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      // Agrupar por provider
      const byProvider: Record<string, { count: number; credits: number; cost: number }> = {};
      data?.forEach(row => {
        if (!byProvider[row.provider]) {
          byProvider[row.provider] = { count: 0, credits: 0, cost: 0 };
        }
        byProvider[row.provider].count++;
        byProvider[row.provider].credits += row.credits_used || 0;
        byProvider[row.provider].cost += parseFloat(row.cost_usd) || 0;
      });

      res.json({
        success: true,
        data: Object.entries(byProvider).map(([provider, stats]) => ({
          provider,
          ...stats,
        })).sort((a, b) => b.credits - a.credits),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter uso por modelo
   */
  async getModelUsage(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      const { data, error } = await supabase
        .from('generations')
        .select('model, provider, credits_used')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .is('deleted_at', null);

      if (error) {
        throw new Error(error.message);
      }

      // Agrupar por modelo
      const byModel: Record<string, { count: number; credits: number; provider: string }> = {};
      data?.forEach(row => {
        if (!byModel[row.model]) {
          byModel[row.model] = { count: 0, credits: 0, provider: row.provider };
        }
        byModel[row.model].count++;
        byModel[row.model].credits += row.credits_used || 0;
      });

      res.json({
        success: true,
        data: Object.entries(byModel).map(([model, stats]) => ({
          model,
          ...stats,
        })).sort((a, b) => b.count - a.count),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter resumo geral
   */
  async getSummary(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      // Período atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Este mês
      const { data: thisMonth } = await supabase
        .from('generations')
        .select('type, credits_used')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
        .is('deleted_at', null);

      // Mês passado
      const { data: lastMonth } = await supabase
        .from('generations')
        .select('type, credits_used')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())
        .is('deleted_at', null);

      const thisMonthStats = {
        total: thisMonth?.length || 0,
        images: thisMonth?.filter(g => g.type === 'image').length || 0,
        videos: thisMonth?.filter(g => g.type === 'video').length || 0,
        credits: thisMonth?.reduce((sum, g) => sum + (g.credits_used || 0), 0) || 0,
      };

      const lastMonthStats = {
        total: lastMonth?.length || 0,
        images: lastMonth?.filter(g => g.type === 'image').length || 0,
        videos: lastMonth?.filter(g => g.type === 'video').length || 0,
        credits: lastMonth?.reduce((sum, g) => sum + (g.credits_used || 0), 0) || 0,
      };

      // Variação percentual
      const variation = {
        total: lastMonthStats.total > 0
          ? ((thisMonthStats.total - lastMonthStats.total) / lastMonthStats.total * 100).toFixed(1)
          : null,
        credits: lastMonthStats.credits > 0
          ? ((thisMonthStats.credits - lastMonthStats.credits) / lastMonthStats.credits * 100).toFixed(1)
          : null,
      };

      // Saldo
      const balance = await creditsService.getBalance(organizationId);

      res.json({
        success: true,
        data: {
          thisMonth: thisMonthStats,
          lastMonth: lastMonthStats,
          variation,
          creditBalance: balance,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Exportar dados
   */
  async exportData(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { type = 'generations', format = 'json', days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));

      let data: any[] = [];

      if (type === 'generations') {
        const { data: generations } = await supabase
          .from('generations')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', startDate.toISOString())
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        data = generations || [];
      } else if (type === 'usage') {
        const { data: usage } = await supabase
          .from('usage_daily')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: false });

        data = usage || [];
      } else if (type === 'transactions') {
        const { data: transactions } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('organization_id', organizationId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        data = transactions || [];
      }

      if (format === 'csv') {
        // Converter para CSV
        if (data.length === 0) {
          return res.type('text/csv').send('');
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row =>
          Object.values(row).map(v =>
            typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
          ).join(',')
        );

        res.type('text/csv').send([headers, ...rows].join('\n'));
      } else {
        res.json({
          success: true,
          data,
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default analyticsController;
