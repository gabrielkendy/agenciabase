import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import { AIProviderFactory } from '../../services/ai/index.js';
import { creditsService } from '../../services/billing/credits.service.js';
import { pricingService } from '../../services/billing/pricing.service.js';
import { logger } from '../../utils/logger.js';

export const studioController = {
  /**
   * Listar modelos disponíveis
   */
  async getModels(req: Request, res: Response) {
    try {
      const imageModels = [
        { id: 'flux-schnell', name: 'Flux Schnell', provider: 'falai', type: 'image', badge: 'Fast' },
        { id: 'flux-dev', name: 'Flux Dev', provider: 'falai', type: 'image', badge: 'Quality' },
        { id: 'flux-pro', name: 'Flux Pro', provider: 'falai', type: 'image', badge: 'Pro' },
        { id: 'sdxl', name: 'SDXL', provider: 'falai', type: 'image' },
        { id: 'ideogram', name: 'Ideogram v2', provider: 'falai', type: 'image', badge: 'Text' },
        { id: 'recraft', name: 'Recraft v3', provider: 'falai', type: 'image' },
        { id: 'dall-e-3', name: 'DALL-E 3', provider: 'openai', type: 'image' },
        { id: 'dall-e-3-hd', name: 'DALL-E 3 HD', provider: 'openai', type: 'image', badge: 'HD' },
        { id: 'imagen-3', name: 'Imagen 3', provider: 'google', type: 'image' },
      ];

      const videoModels = [
        { id: 'fast-svd', name: 'Fast SVD', provider: 'falai', type: 'video', badge: 'Fast' },
        { id: 'stable-video', name: 'Stable Video', provider: 'falai', type: 'video' },
        { id: 'kling-standard', name: 'Kling Standard', provider: 'falai', type: 'video' },
        { id: 'kling-pro', name: 'Kling Pro', provider: 'falai', type: 'video', badge: 'Pro' },
        { id: 'minimax', name: 'MiniMax', provider: 'falai', type: 'video' },
        { id: 'luma-ray2', name: 'Luma Ray2', provider: 'falai', type: 'video', badge: 'Quality' },
      ];

      // Adicionar preços
      const modelsWithPricing = await Promise.all([
        ...imageModels.map(async (m) => {
          const cost = await pricingService.calculateCost({
            provider: m.provider,
            model: m.id,
          });
          return { ...m, creditsPerImage: cost.credits };
        }),
        ...videoModels.map(async (m) => {
          const cost = await pricingService.calculateCost({
            provider: m.provider,
            model: m.id,
            durationSeconds: 5,
          });
          return { ...m, creditsPerSecond: Math.ceil(cost.credits / 5) };
        }),
      ]);

      res.json({
        success: true,
        data: {
          image: modelsWithPricing.filter(m => m.type === 'image'),
          video: modelsWithPricing.filter(m => m.type === 'video'),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter histórico de gerações
   */
  async getHistory(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user!;
      const { type, limit = 50, offset = 0, favorites } = req.query;

      let query = supabase
        .from('generations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (type) {
        query = query.eq('type', type);
      }

      if (favorites === 'true') {
        query = query.eq('is_favorite', true);
      }

      const { data, error } = await query;

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
   * Toggle favorite
   */
  async toggleFavorite(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Get current state
      const { data: current } = await supabase
        .from('generations')
        .select('is_favorite')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (!current) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Toggle
      const { data, error } = await supabase
        .from('generations')
        .update({ is_favorite: !current.is_favorite })
        .eq('id', id)
        .eq('organization_id', organizationId)
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
   * Obter estatísticas do studio
   */
  async getStats(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      // Total por tipo
      const { data: byType } = await supabase
        .from('generations')
        .select('type')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const stats = {
        total: byType?.length || 0,
        images: byType?.filter(g => g.type === 'image').length || 0,
        videos: byType?.filter(g => g.type === 'video').length || 0,
        audio: byType?.filter(g => g.type === 'audio').length || 0,
      };

      // Por provider
      const { data: byProvider } = await supabase
        .from('generations')
        .select('provider')
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      const providerStats: Record<string, number> = {};
      byProvider?.forEach(g => {
        providerStats[g.provider] = (providerStats[g.provider] || 0) + 1;
      });

      // Créditos usados este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyUsage } = await supabase
        .from('generations')
        .select('credits_used')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
        .is('deleted_at', null);

      const monthlyCreditsUsed = monthlyUsage?.reduce((sum, g) => sum + (g.credits_used || 0), 0) || 0;

      // Saldo atual
      const balance = await creditsService.getBalance(organizationId);

      res.json({
        success: true,
        data: {
          ...stats,
          byProvider: providerStats,
          monthlyCreditsUsed,
          creditBalance: balance,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar geração
   */
  async deleteGeneration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('generations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Bulk delete
   */
  async bulkDelete(req: Request, res: Response) {
    try {
      const { ids } = req.body;
      const { organizationId } = req.user!;

      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: 'IDs array is required' });
      }

      const { error } = await supabase
        .from('generations')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({ success: true, deleted: ids.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default studioController;
