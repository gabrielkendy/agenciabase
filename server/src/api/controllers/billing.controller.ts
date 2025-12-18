import { Request, Response } from 'express';
import { creditsService } from '../../services/billing/credits.service.js';
import { pricingService } from '../../services/billing/pricing.service.js';
import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export const billingController = {
  /**
   * Obter saldo de créditos
   */
  async getBalance(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const balance = await creditsService.getBalance(organizationId);
      const usage = await creditsService.getPeriodUsage(organizationId);

      res.json({
        success: true,
        data: {
          balance,
          ...usage,
        },
      });
    } catch (error: any) {
      logger.error('Get balance error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter histórico de transações
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { limit = 50, offset = 0, type } = req.query;

      const transactions = await creditsService.getTransactions(organizationId, {
        limit: Number(limit),
        offset: Number(offset),
        type: type as string,
      });

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Get transactions error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter planos disponíveis
   */
  async getPlans(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly');

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
   * Obter assinatura atual
   */
  async getSubscription(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          plans (*)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data: data || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter pricing
   */
  async getPricing(req: Request, res: Response) {
    try {
      const pricing = await pricingService.getAllPricing();

      res.json({
        success: true,
        data: pricing,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Calcular custo de uma operação
   */
  async calculateCost(req: Request, res: Response) {
    try {
      const { provider, model, operation = 'generate', quantity = 1, durationSeconds } = req.body;

      if (!provider || !model) {
        return res.status(400).json({ error: 'Provider and model are required' });
      }

      const cost = await pricingService.calculateCost({
        provider,
        model,
        operation,
        quantity,
        durationSeconds,
      });

      res.json({
        success: true,
        data: cost,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter uso diário (analytics)
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
   * Adicionar créditos (admin/webhook)
   */
  async addCredits(req: Request, res: Response) {
    try {
      const { organizationId, amount, type = 'purchase', description } = req.body;

      if (!organizationId || !amount) {
        return res.status(400).json({ error: 'Organization ID and amount are required' });
      }

      const result = await creditsService.credit({
        organizationId,
        amount,
        type,
        description,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Add credits error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

export default billingController;
