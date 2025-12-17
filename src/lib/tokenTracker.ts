// ============================================
// SISTEMA DE TRACKING DE TOKENS E CONSUMO
// Monitora uso de APIs, custos e performance
// ============================================

export interface TokenUsage {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  provider: 'gemini' | 'openrouter' | 'openai' | 'freepik' | 'elevenlabs' | 'falai';
  model?: string;
  action: 'chat' | 'image' | 'video' | 'audio' | 'other';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number; // em USD
  responseTimeMs: number;
  success: boolean;
  error?: string;
}

export interface DailyUsage {
  date: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  avgResponseTime: number;
  byProvider: Record<string, { tokens: number; cost: number; requests: number }>;
  byUser: Record<string, { tokens: number; cost: number; requests: number; userName?: string }>;
}

export interface UsageSummary {
  today: DailyUsage;
  thisWeek: DailyUsage;
  thisMonth: DailyUsage;
  allTime: DailyUsage;
}

// Precos por 1M tokens (aproximados)
const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  // OpenRouter / OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'llama-3.1-70b': { input: 0.52, output: 0.75 },
  'llama-3.1-8b': { input: 0.06, output: 0.06 },
  'mistral-large': { input: 2.00, output: 6.00 },
  'gemini-pro': { input: 0.50, output: 1.50 },
  'gemini-flash': { input: 0.075, output: 0.30 },
  // Gemini
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  // Defaults
  'default': { input: 0.50, output: 1.50 },
};

// Precos por geracao (imagem/video/audio)
const GENERATION_PRICES: Record<string, number> = {
  'freepik': 0.02, // por imagem
  'dalle-3': 0.04, // por imagem
  'flux-schnell': 0.003, // por imagem
  'elevenlabs': 0.30, // por 1000 caracteres
  'falai-video': 0.10, // por segundo de video
};

const STORAGE_KEY = 'base_agency_token_usage';
const MAX_ENTRIES = 10000;

class TokenTracker {
  private usage: TokenUsage[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.usage = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar uso de tokens:', e);
      this.usage = [];
    }
  }

  private saveToStorage() {
    try {
      // Limitar entradas
      if (this.usage.length > MAX_ENTRIES) {
        this.usage = this.usage.slice(-MAX_ENTRIES);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usage));
    } catch (e) {
      console.error('Erro ao salvar uso de tokens:', e);
    }
  }

  // Calcular custo baseado no modelo
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const prices = TOKEN_PRICES[model] || TOKEN_PRICES['default'];
    const inputCost = (inputTokens / 1_000_000) * prices.input;
    const outputCost = (outputTokens / 1_000_000) * prices.output;
    return inputCost + outputCost;
  }

  // Calcular custo de geracao
  calculateGenerationCost(provider: string, units: number): number {
    const price = GENERATION_PRICES[provider] || 0.01;
    return units * price;
  }

  // Registrar uso de chat/texto
  trackChat(params: {
    userId: string;
    userName?: string;
    provider: TokenUsage['provider'];
    model: string;
    inputTokens: number;
    outputTokens: number;
    responseTimeMs: number;
    success: boolean;
    error?: string;
  }): TokenUsage {
    const totalTokens = params.inputTokens + params.outputTokens;
    const cost = this.calculateCost(params.model, params.inputTokens, params.outputTokens);

    const entry: TokenUsage = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      provider: params.provider,
      model: params.model,
      action: 'chat',
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens,
      cost,
      responseTimeMs: params.responseTimeMs,
      success: params.success,
      error: params.error,
    };

    this.usage.push(entry);
    this.saveToStorage();
    return entry;
  }

  // Registrar geracao de imagem
  trackImage(params: {
    userId: string;
    userName?: string;
    provider: TokenUsage['provider'];
    model?: string;
    imageCount: number;
    responseTimeMs: number;
    success: boolean;
    error?: string;
  }): TokenUsage {
    const cost = this.calculateGenerationCost(params.provider, params.imageCount);

    const entry: TokenUsage = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      provider: params.provider,
      model: params.model,
      action: 'image',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: params.imageCount, // Usar como contagem
      cost,
      responseTimeMs: params.responseTimeMs,
      success: params.success,
      error: params.error,
    };

    this.usage.push(entry);
    this.saveToStorage();
    return entry;
  }

  // Registrar geracao de audio
  trackAudio(params: {
    userId: string;
    userName?: string;
    provider: TokenUsage['provider'];
    characters: number;
    responseTimeMs: number;
    success: boolean;
    error?: string;
  }): TokenUsage {
    const cost = this.calculateGenerationCost('elevenlabs', params.characters / 1000);

    const entry: TokenUsage = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      provider: params.provider,
      action: 'audio',
      inputTokens: params.characters,
      outputTokens: 0,
      totalTokens: params.characters,
      cost,
      responseTimeMs: params.responseTimeMs,
      success: params.success,
      error: params.error,
    };

    this.usage.push(entry);
    this.saveToStorage();
    return entry;
  }

  // Registrar geracao de video
  trackVideo(params: {
    userId: string;
    userName?: string;
    provider: TokenUsage['provider'];
    durationSeconds: number;
    responseTimeMs: number;
    success: boolean;
    error?: string;
  }): TokenUsage {
    const cost = this.calculateGenerationCost('falai-video', params.durationSeconds);

    const entry: TokenUsage = {
      id: `tok_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      provider: params.provider,
      action: 'video',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: params.durationSeconds,
      cost,
      responseTimeMs: params.responseTimeMs,
      success: params.success,
      error: params.error,
    };

    this.usage.push(entry);
    this.saveToStorage();
    return entry;
  }

  // Obter todos os registros
  getAll(): TokenUsage[] {
    return [...this.usage];
  }

  // Obter registros filtrados
  getFiltered(params: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    provider?: string;
    action?: string;
  }): TokenUsage[] {
    return this.usage.filter(entry => {
      if (params.startDate && entry.timestamp < params.startDate) return false;
      if (params.endDate && entry.timestamp > params.endDate) return false;
      if (params.userId && entry.userId !== params.userId) return false;
      if (params.provider && entry.provider !== params.provider) return false;
      if (params.action && entry.action !== params.action) return false;
      return true;
    });
  }

  // Calcular uso diario
  private calculateDailyUsage(entries: TokenUsage[]): DailyUsage {
    const byProvider: Record<string, { tokens: number; cost: number; requests: number }> = {};
    const byUser: Record<string, { tokens: number; cost: number; requests: number; userName?: string }> = {};

    let totalTokens = 0;
    let totalCost = 0;
    let totalResponseTime = 0;

    entries.forEach(entry => {
      totalTokens += entry.totalTokens;
      totalCost += entry.cost;
      totalResponseTime += entry.responseTimeMs;

      // Por provider
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = { tokens: 0, cost: 0, requests: 0 };
      }
      byProvider[entry.provider].tokens += entry.totalTokens;
      byProvider[entry.provider].cost += entry.cost;
      byProvider[entry.provider].requests += 1;

      // Por usuario
      if (!byUser[entry.userId]) {
        byUser[entry.userId] = { tokens: 0, cost: 0, requests: 0, userName: entry.userName };
      }
      byUser[entry.userId].tokens += entry.totalTokens;
      byUser[entry.userId].cost += entry.cost;
      byUser[entry.userId].requests += 1;
    });

    return {
      date: new Date().toISOString().split('T')[0],
      totalTokens,
      totalCost,
      requestCount: entries.length,
      avgResponseTime: entries.length > 0 ? totalResponseTime / entries.length : 0,
      byProvider,
      byUser,
    };
  }

  // Obter resumo de uso
  getSummary(): UsageSummary {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const todayEntries = this.usage.filter(e => e.timestamp >= todayStart);
    const weekEntries = this.usage.filter(e => e.timestamp >= weekStart);
    const monthEntries = this.usage.filter(e => e.timestamp >= monthStart);

    return {
      today: this.calculateDailyUsage(todayEntries),
      thisWeek: this.calculateDailyUsage(weekEntries),
      thisMonth: this.calculateDailyUsage(monthEntries),
      allTime: this.calculateDailyUsage(this.usage),
    };
  }

  // Obter historico por dia
  getDailyHistory(days: number = 30): { date: string; tokens: number; cost: number; requests: number }[] {
    const history: Record<string, { tokens: number; cost: number; requests: number }> = {};
    const now = new Date();

    // Inicializar dias
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      history[dateStr] = { tokens: 0, cost: 0, requests: 0 };
    }

    // Preencher com dados
    this.usage.forEach(entry => {
      const dateStr = entry.timestamp.split('T')[0];
      if (history[dateStr]) {
        history[dateStr].tokens += entry.totalTokens;
        history[dateStr].cost += entry.cost;
        history[dateStr].requests += 1;
      }
    });

    // Converter para array ordenado
    return Object.entries(history)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Obter top usuarios
  getTopUsers(limit: number = 10): { userId: string; userName?: string; tokens: number; cost: number; requests: number }[] {
    const byUser: Record<string, { userName?: string; tokens: number; cost: number; requests: number }> = {};

    this.usage.forEach(entry => {
      if (!byUser[entry.userId]) {
        byUser[entry.userId] = { userName: entry.userName, tokens: 0, cost: 0, requests: 0 };
      }
      byUser[entry.userId].tokens += entry.totalTokens;
      byUser[entry.userId].cost += entry.cost;
      byUser[entry.userId].requests += 1;
    });

    return Object.entries(byUser)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  }

  // Obter metricas de performance
  getPerformanceMetrics(): {
    avgResponseTime: number;
    fastestProvider: string;
    slowestProvider: string;
    successRate: number;
    byProvider: Record<string, { avgTime: number; successRate: number }>;
  } {
    const byProvider: Record<string, { totalTime: number; count: number; successes: number }> = {};

    this.usage.forEach(entry => {
      if (!byProvider[entry.provider]) {
        byProvider[entry.provider] = { totalTime: 0, count: 0, successes: 0 };
      }
      byProvider[entry.provider].totalTime += entry.responseTimeMs;
      byProvider[entry.provider].count += 1;
      if (entry.success) byProvider[entry.provider].successes += 1;
    });

    const providerMetrics: Record<string, { avgTime: number; successRate: number }> = {};
    let fastestProvider = '';
    let slowestProvider = '';
    let fastestTime = Infinity;
    let slowestTime = 0;

    Object.entries(byProvider).forEach(([provider, data]) => {
      const avgTime = data.count > 0 ? data.totalTime / data.count : 0;
      const successRate = data.count > 0 ? (data.successes / data.count) * 100 : 0;
      providerMetrics[provider] = { avgTime, successRate };

      if (avgTime < fastestTime && avgTime > 0) {
        fastestTime = avgTime;
        fastestProvider = provider;
      }
      if (avgTime > slowestTime) {
        slowestTime = avgTime;
        slowestProvider = provider;
      }
    });

    const totalRequests = this.usage.length;
    const successfulRequests = this.usage.filter(e => e.success).length;
    const totalTime = this.usage.reduce((sum, e) => sum + e.responseTimeMs, 0);

    return {
      avgResponseTime: totalRequests > 0 ? totalTime / totalRequests : 0,
      fastestProvider,
      slowestProvider,
      successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100,
      byProvider: providerMetrics,
    };
  }

  // Limpar registros antigos
  clearOldEntries(daysToKeep: number = 90) {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    this.usage = this.usage.filter(e => e.timestamp >= cutoff);
    this.saveToStorage();
  }

  // Limpar tudo
  clearAll() {
    this.usage = [];
    this.saveToStorage();
  }

  // Exportar dados
  exportData(): string {
    return JSON.stringify(this.usage, null, 2);
  }
}

// Singleton
export const tokenTracker = new TokenTracker();

// Helper para medir tempo de resposta
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> => {
  const start = performance.now();
  const result = await fn();
  const timeMs = Math.round(performance.now() - start);
  return { result, timeMs };
};

export default tokenTracker;
