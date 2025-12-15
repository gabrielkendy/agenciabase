// OpenRouter API Service
// Docs: https://openrouter.ai/docs

import { AIModel, AI_MODELS } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterService {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  // Validar API key
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Listar modelos disponíveis
  async getModels(): Promise<any[]> {
    if (!this.apiKey) return [];
    
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  // Chat completion
  async chat(
    model: AIModel,
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
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
        model: model,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Erro ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // Chat com streaming
  async *chatStream(
    model: AIModel,
    messages: ChatMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): AsyncGenerator<string> {
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
        model: model,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Erro ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Stream não disponível');

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
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignorar linhas mal formatadas
          }
        }
      }
    }
  }

  // Obter info do modelo
  getModelInfo(modelId: AIModel) {
    return AI_MODELS.find(m => m.id === modelId);
  }

  // Verificar se modelo é gratuito
  isModelFree(modelId: AIModel): boolean {
    const model = this.getModelInfo(modelId);
    return model?.isFree ?? false;
  }

  // Obter apenas modelos gratuitos
  getFreeModels() {
    return AI_MODELS.filter(m => m.isFree);
  }

  // Obter modelos por provider
  getModelsByProvider(provider: 'openai' | 'gemini' | 'openrouter') {
    return AI_MODELS.filter(m => m.provider === provider);
  }
}

// Singleton
export const openrouterService = new OpenRouterService();
