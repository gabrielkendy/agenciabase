// OpenRouter Service - Multi-Model AI Access
// Acesso a múltiplos modelos de IA (GPT-4, Claude, Gemini, Llama, etc.)

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

// Modelos populares disponíveis no OpenRouter
export const POPULAR_MODELS = {
  // OpenAI
  GPT4_TURBO: 'openai/gpt-4-turbo-preview',
  GPT4: 'openai/gpt-4',
  GPT35_TURBO: 'openai/gpt-3.5-turbo',
  
  // Anthropic
  CLAUDE_3_OPUS: 'anthropic/claude-3-opus',
  CLAUDE_3_SONNET: 'anthropic/claude-3-sonnet',
  CLAUDE_3_HAIKU: 'anthropic/claude-3-haiku',
  
  // Google
  GEMINI_PRO: 'google/gemini-pro',
  GEMINI_PRO_VISION: 'google/gemini-pro-vision',
  
  // Meta
  LLAMA_3_70B: 'meta-llama/llama-3-70b-instruct',
  LLAMA_3_8B: 'meta-llama/llama-3-8b-instruct',
  
  // Mistral
  MISTRAL_LARGE: 'mistralai/mistral-large',
  MISTRAL_MEDIUM: 'mistralai/mistral-medium',
  MIXTRAL_8X7B: 'mistralai/mixtral-8x7b-instruct',
  
  // Others
  COHERE_COMMAND: 'cohere/command-r-plus',
  PERPLEXITY: 'perplexity/pplx-70b-online',
} as const;

class OpenRouterService {
  private apiKey: string = '';
  private defaultModel: string = POPULAR_MODELS.GPT4_TURBO;
  private baseUrl = 'https://openrouter.ai/api/v1';

  setConfig(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BASE Agency SaaS',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // CHAT COMPLETIONS
  // ============================================

  async chat(params: ChatCompletionParams): Promise<{
    id: string;
    choices: Array<{ message: ChatMessage; finish_reason: string }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }> {
    return this.request('/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
        top_p: params.top_p,
        frequency_penalty: params.frequency_penalty,
        presence_penalty: params.presence_penalty,
      }),
    });
  }

  // Chat com streaming
  async *chatStream(params: ChatCompletionParams): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'BASE Agency SaaS',
      },
      body: JSON.stringify({
        model: params.model || this.defaultModel,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.max_tokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  // ============================================
  // MODELS
  // ============================================

  async getModels(): Promise<{ data: Model[] }> {
    return this.request('/models');
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  // Chat simples (uma mensagem, uma resposta)
  async simpleChat(
    userMessage: string,
    systemPrompt?: string,
    model?: string
  ): Promise<string> {
    const messages: ChatMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: userMessage });

    const response = await this.chat({
      model,
      messages,
    });

    return response.choices[0]?.message?.content || '';
  }

  // Gerar com diferentes modelos e comparar
  async compareModels(
    userMessage: string,
    models: string[],
    systemPrompt?: string
  ): Promise<Array<{ model: string; response: string; tokens: number }>> {
    const results = await Promise.all(
      models.map(async (model) => {
        try {
          const messages: ChatMessage[] = [];
          if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
          }
          messages.push({ role: 'user', content: userMessage });

          const response = await this.chat({ model, messages });
          
          return {
            model,
            response: response.choices[0]?.message?.content || '',
            tokens: response.usage?.total_tokens || 0,
          };
        } catch (error: any) {
          return {
            model,
            response: `Erro: ${error.message}`,
            tokens: 0,
          };
        }
      })
    );

    return results;
  }

  // Verificar se está configurado
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  // Obter modelo padrão
  getDefaultModel(): string {
    return this.defaultModel;
  }

  // Definir modelo padrão
  setDefaultModel(model: string) {
    this.defaultModel = model;
  }
}

export const openRouterService = new OpenRouterService();
export default openRouterService;
