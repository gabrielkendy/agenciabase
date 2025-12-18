import { supabase } from '../../config/database.js';

interface PricingInfo {
  creditsPerUnit: number;
  costUsdPerUnit: number;
  resolutionMultiplier?: number;
}

// Cache de preços
let pricingCache: Map<string, PricingInfo> = new Map();
let cacheExpiry: Date | null = null;

// Preços fallback caso banco não tenha
const FALLBACK_PRICING: Record<string, PricingInfo> = {
  'falai:flux-schnell:generate': { creditsPerUnit: 1, costUsdPerUnit: 0.003 },
  'falai:flux-dev:generate': { creditsPerUnit: 2, costUsdPerUnit: 0.025 },
  'falai:flux-pro:generate': { creditsPerUnit: 3, costUsdPerUnit: 0.055 },
  'openai:dall-e-3:generate': { creditsPerUnit: 4, costUsdPerUnit: 0.04 },
  'google:imagen-3:generate': { creditsPerUnit: 3, costUsdPerUnit: 0.03 },
  'freepik:mystic:generate': { creditsPerUnit: 1, costUsdPerUnit: 0.02 },
  'elevenlabs:eleven_multilingual_v2:generate': { creditsPerUnit: 1, costUsdPerUnit: 0.30 },
};

export const pricingService = {
  /**
   * Obter preço de uma operação
   */
  async getPrice(
    provider: string,
    model: string,
    operation: string = 'generate',
    resolution?: string
  ): Promise<PricingInfo> {
    // Verificar cache
    const cacheKey = `${provider}:${model}:${operation}`;

    if (cacheExpiry && cacheExpiry > new Date() && pricingCache.has(cacheKey)) {
      const cached = pricingCache.get(cacheKey)!;

      // Aplicar multiplicador de resolução se necessário
      if (resolution && cached.resolutionMultiplier) {
        return {
          ...cached,
          creditsPerUnit: Math.ceil(cached.creditsPerUnit * cached.resolutionMultiplier),
        };
      }

      return cached;
    }

    // Buscar do banco
    await this.refreshCache();

    // Retornar do cache ou fallback
    return pricingCache.get(cacheKey) || FALLBACK_PRICING[cacheKey] || {
      creditsPerUnit: 1,
      costUsdPerUnit: 0.01,
    };
  },

  /**
   * Calcular custo de uma geração
   */
  async calculateCost(params: {
    provider: string;
    model: string;
    operation?: string;
    resolution?: string;
    quantity?: number;
    durationSeconds?: number;
    characters?: number;
  }): Promise<{
    credits: number;
    costUsd: number;
  }> {
    const { provider, model, operation = 'generate', resolution, quantity = 1, durationSeconds, characters } = params;

    const pricing = await this.getPrice(provider, model, operation, resolution);

    let multiplier = 1;

    // Para vídeo/áudio, multiplicar por duração
    if (durationSeconds) {
      multiplier = Math.ceil(durationSeconds);
    }

    // Para texto/áudio, multiplicar por caracteres (a cada 1000)
    if (characters) {
      multiplier = Math.ceil(characters / 1000);
    }

    // Aplicar multiplicador de resolução
    if (resolution && pricing.resolutionMultiplier) {
      multiplier *= pricing.resolutionMultiplier;
    }

    const credits = Math.ceil(pricing.creditsPerUnit * quantity * multiplier);
    const costUsd = pricing.costUsdPerUnit * quantity * multiplier;

    return { credits, costUsd };
  },

  /**
   * Atualizar cache de preços
   */
  async refreshCache(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('pricing')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching pricing:', error);
        return;
      }

      pricingCache.clear();

      for (const price of data || []) {
        const key = `${price.provider}:${price.model}:${price.operation}`;
        pricingCache.set(key, {
          creditsPerUnit: price.credits_per_unit,
          costUsdPerUnit: parseFloat(price.cost_usd_per_unit),
          resolutionMultiplier: price.resolution_multipliers,
        });
      }

      // Cache válido por 5 minutos
      cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);
    } catch (error) {
      console.error('Error refreshing pricing cache:', error);
    }
  },

  /**
   * Obter todos os preços (para admin)
   */
  async getAllPricing() {
    const { data, error } = await supabase
      .from('pricing')
      .select('*')
      .order('provider');

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Atualizar preço (admin)
   */
  async updatePricing(
    provider: string,
    model: string,
    operation: string,
    creditsPerUnit: number,
    costUsdPerUnit: number
  ) {
    const { error } = await supabase
      .from('pricing')
      .upsert({
        provider,
        model,
        operation,
        credits_per_unit: creditsPerUnit,
        cost_usd_per_unit: costUsdPerUnit,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(error.message);
    }

    // Invalidar cache
    cacheExpiry = null;
  },
};

export default pricingService;
