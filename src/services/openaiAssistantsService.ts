// OpenAI Assistants API Service
// Permite importar e usar Assistants já criados na OpenAI

export interface OpenAIAssistant {
  id: string;
  object: string;
  created_at: number;
  name: string | null;
  description: string | null;
  model: string;
  instructions: string | null;
  tools: Array<{ type: string }>;
  file_ids: string[];
  metadata: Record<string, string>;
}

export interface AssistantThread {
  id: string;
  object: string;
  created_at: number;
  metadata: Record<string, string>;
}

export interface ThreadMessage {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: { value: string; annotations: any[] };
  }>;
  file_ids: string[];
  assistant_id: string | null;
  run_id: string | null;
  metadata: Record<string, string>;
}

export interface ThreadRun {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  assistant_id: string;
  status: 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired';
  required_action: any | null;
  last_error: { code: string; message: string } | null;
  expires_at: number | null;
  started_at: number | null;
  cancelled_at: number | null;
  failed_at: number | null;
  completed_at: number | null;
  model: string;
  instructions: string | null;
  tools: Array<{ type: string }>;
  file_ids: string[];
  metadata: Record<string, string>;
}

class OpenAIAssistantsService {
  private apiKey: string = '';
  private baseUrl = 'https://api.openai.com/v1';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ============================================
  // ASSISTANTS
  // ============================================

  // Buscar assistant pelo ID
  async getAssistant(assistantId: string): Promise<OpenAIAssistant> {
    return this.request<OpenAIAssistant>(`/assistants/${assistantId}`);
  }

  // Listar todos os assistants
  async listAssistants(limit = 20): Promise<{ data: OpenAIAssistant[]; has_more: boolean }> {
    return this.request(`/assistants?limit=${limit}&order=desc`);
  }

  // Criar um novo assistant
  async createAssistant(params: {
    name: string;
    instructions: string;
    model: string;
    tools?: Array<{ type: string }>;
  }): Promise<OpenAIAssistant> {
    return this.request<OpenAIAssistant>('/assistants', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Atualizar assistant
  async updateAssistant(assistantId: string, params: {
    name?: string;
    instructions?: string;
    model?: string;
  }): Promise<OpenAIAssistant> {
    return this.request<OpenAIAssistant>(`/assistants/${assistantId}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Deletar assistant
  async deleteAssistant(assistantId: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/assistants/${assistantId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // THREADS
  // ============================================

  // Criar thread
  async createThread(messages?: Array<{ role: 'user'; content: string }>): Promise<AssistantThread> {
    return this.request<AssistantThread>('/threads', {
      method: 'POST',
      body: JSON.stringify(messages ? { messages } : {}),
    });
  }

  // Buscar thread
  async getThread(threadId: string): Promise<AssistantThread> {
    return this.request<AssistantThread>(`/threads/${threadId}`);
  }

  // Deletar thread
  async deleteThread(threadId: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/threads/${threadId}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // MESSAGES
  // ============================================

  // Adicionar mensagem à thread
  async addMessage(threadId: string, content: string): Promise<ThreadMessage> {
    return this.request<ThreadMessage>(`/threads/${threadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ role: 'user', content }),
    });
  }

  // Listar mensagens da thread
  async listMessages(threadId: string, limit = 20): Promise<{ data: ThreadMessage[]; has_more: boolean }> {
    return this.request(`/threads/${threadId}/messages?limit=${limit}&order=desc`);
  }

  // ============================================
  // RUNS
  // ============================================

  // Executar assistant na thread
  async createRun(threadId: string, assistantId: string, instructions?: string): Promise<ThreadRun> {
    return this.request<ThreadRun>(`/threads/${threadId}/runs`, {
      method: 'POST',
      body: JSON.stringify({
        assistant_id: assistantId,
        ...(instructions && { instructions }),
      }),
    });
  }

  // Buscar status do run
  async getRun(threadId: string, runId: string): Promise<ThreadRun> {
    return this.request<ThreadRun>(`/threads/${threadId}/runs/${runId}`);
  }

  // Aguardar conclusão do run (polling)
  async waitForRun(threadId: string, runId: string, maxWaitMs = 60000): Promise<ThreadRun> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const run = await this.getRun(threadId, runId);

      if (run.status === 'completed') {
        return run;
      }

      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
      }

      // Aguardar 1 segundo antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout aguardando resposta do assistant');
  }

  // ============================================
  // HELPER: Chat completo com assistant
  // ============================================

  async chat(assistantId: string, message: string, threadId?: string): Promise<{
    response: string;
    threadId: string;
  }> {
    // Criar ou usar thread existente
    let thread: AssistantThread;
    if (threadId) {
      thread = await this.getThread(threadId);
    } else {
      thread = await this.createThread();
    }

    // Adicionar mensagem do usuário
    await this.addMessage(thread.id, message);

    // Criar e executar run
    const run = await this.createRun(thread.id, assistantId);

    // Aguardar conclusão
    await this.waitForRun(thread.id, run.id);

    // Buscar mensagens (a mais recente será a resposta)
    const messages = await this.listMessages(thread.id, 1);
    const assistantMessage = messages.data.find(m => m.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('Nenhuma resposta do assistant');
    }

    const response = assistantMessage.content
      .filter(c => c.type === 'text')
      .map(c => c.text.value)
      .join('\n');

    return {
      response,
      threadId: thread.id,
    };
  }

  // Validar se ID é um assistant válido
  async validateAssistantId(assistantId: string): Promise<{ valid: boolean; assistant?: OpenAIAssistant; error?: string }> {
    try {
      const assistant = await this.getAssistant(assistantId);
      return { valid: true, assistant };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
}

export const openaiAssistantsService = new OpenAIAssistantsService();
