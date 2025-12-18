import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

interface DebitResult {
  success: boolean;
  newBalance?: number;
  error?: string;
}

interface CreditResult {
  success: boolean;
  newBalance: number;
}

export const creditsService = {
  /**
   * Obter saldo de créditos
   */
  async getBalance(organizationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('balance')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.balance;
  },

  /**
   * Verificar se tem créditos suficientes
   */
  async hasEnoughCredits(organizationId: string, amount: number): Promise<boolean> {
    const balance = await this.getBalance(organizationId);
    return balance >= amount;
  },

  /**
   * Debitar créditos (usar)
   */
  async debit(params: {
    organizationId: string;
    userId: string;
    amount: number;
    referenceType: string;
    referenceId: string;
    description?: string;
  }): Promise<DebitResult> {
    const { organizationId, userId, amount, referenceType, referenceId, description } = params;

    try {
      // Chamar função do banco
      const { data, error } = await supabase.rpc('debit_credits', {
        p_organization_id: organizationId,
        p_user_id: userId,
        p_amount: amount,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_description: description,
      });

      if (error) {
        logger.error('Error debiting credits:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: false, error: 'Insufficient credits' };
      }

      const newBalance = await this.getBalance(organizationId);
      return { success: true, newBalance };

    } catch (error: any) {
      logger.error('Error debiting credits:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Creditar créditos (adicionar)
   */
  async credit(params: {
    organizationId: string;
    amount: number;
    type: 'purchase' | 'subscription' | 'bonus' | 'refund' | 'adjustment';
    description?: string;
  }): Promise<CreditResult> {
    const { organizationId, amount, type, description } = params;

    const { data, error } = await supabase.rpc('credit_credits', {
      p_organization_id: organizationId,
      p_amount: amount,
      p_type: type,
      p_description: description,
    });

    if (error) {
      throw new Error(`Error crediting: ${error.message}`);
    }

    return { success: true, newBalance: data };
  },

  /**
   * Obter histórico de transações
   */
  async getTransactions(organizationId: string, options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }) {
    let query = supabase
      .from('credit_transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Obter uso do período atual
   */
  async getPeriodUsage(organizationId: string) {
    const { data, error } = await supabase
      .from('credit_balances')
      .select('period_start, period_end, period_credits_used, balance')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      periodStart: data.period_start,
      periodEnd: data.period_end,
      creditsUsed: data.period_credits_used,
      creditsRemaining: data.balance,
    };
  },

  /**
   * Inicializar saldo para nova organização
   */
  async initializeBalance(organizationId: string, initialCredits: number = 50): Promise<void> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from('credit_balances').upsert({
      organization_id: organizationId,
      balance: initialCredits,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      period_credits_used: 0,
    });
  },
};

export default creditsService;
