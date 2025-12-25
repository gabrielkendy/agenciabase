// OpenAI Assistants Service v2 - Com memória persistente
// Permite criar, buscar e usar Assistants com threads persistentes

import OpenAI from 'openai';

export interface AssistantConfig {
  id: string;
  name: string;
  role: string;
  avatar: string;
  openai_assistant_id?: string; // ID do assistant na OpenAI
  instructions: string;
  model: string;
  tools?: OpenAI.Beta.Assistants.AssistantTool[];
}

export interface ThreadData {
  id: string;
  assistant_id: string;
  openai_thread_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// Storage keys
const STORAGE_KEYS = {
  ASSISTANTS: 'openai_assistants_map',
  THREADS: 'openai_threads_map',
};

class OpenAIAssistantsServiceV2 {
  private client: OpenAI | null = null;
  private assistantsMap: Map<string, string> = new Map(); // local_id -> openai_id
  private threadsMap: Map<string, ThreadData[]> = new Map(); // assistant_id -> threads

  constructor() {
    this.loadFromStorage();
  }

  // Inicializar cliente
  initialize(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Para uso no frontend
    });
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  // Carregar dados do localStorage
  private loadFromStorage() {
    try {
      const assistants = localStorage.getItem(STORAGE_KEYS.ASSISTANTS);
      const threads = localStorage.getItem(STORAGE_KEYS.THREADS);
      
      if (assistants) {
        this.assistantsMap = new Map(JSON.parse(assistants));
      }
      if (threads) {
        const threadsData = JSON.parse(threads) as Record<string, ThreadData[]>;
        this.threadsMap = new Map(Object.entries(threadsData));
      }
    } catch (error) {
      console.error('Erro ao carregar dados do storage:', error);
    }
  }

  // Salvar dados no localStorage
  private saveToStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.ASSISTANTS,
        JSON.stringify(Array.from(this.assistantsMap.entries()))
      );
      
      const threadsObj: Record<string, ThreadData[]> = {};
      this.threadsMap.forEach((value, key) => {
        threadsObj[key] = value;
      });
      localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threadsObj));
    } catch (error) {
      console.error('Erro ao salvar dados no storage:', error);
    }
  }

  // ============================================
  // ASSISTANTS
  // ============================================

  // Criar ou recuperar um Assistant
  async getOrCreateAssistant(config: AssistantConfig): Promise<string> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    // Verificar se já existe mapeamento
    const existingId = this.assistantsMap.get(config.id);
    if (existingId) {
      // Verificar se ainda existe na OpenAI
      try {
        await this.client.beta.assistants.retrieve(existingId);
        return existingId;
      } catch {
        // Assistant não existe mais, remover do mapa
        this.assistantsMap.delete(config.id);
      }
    }

    // Se foi passado um ID específico da OpenAI, usar ele
    if (config.openai_assistant_id) {
      try {
        await this.client.beta.assistants.retrieve(config.openai_assistant_id);
        this.assistantsMap.set(config.id, config.openai_assistant_id);
        this.saveToStorage();
        return config.openai_assistant_id;
      } catch {
        console.error('Assistant ID fornecido não existe');
      }
    }

    // Criar novo Assistant
    const assistant = await this.client.beta.assistants.create({
      name: config.name,
      instructions: config.instructions,
      model: config.model || 'gpt-4-turbo-preview',
      tools: config.tools || [{ type: 'code_interpreter' }],
    });

    this.assistantsMap.set(config.id, assistant.id);
    this.saveToStorage();
    
    return assistant.id;
  }

  // Buscar Assistant por ID (local ou OpenAI)
  async getAssistant(id: string): Promise<OpenAI.Beta.Assistants.Assistant | null> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    // Tentar buscar pelo mapeamento local
    const openaiId = this.assistantsMap.get(id) || id;

    try {
      return await this.client.beta.assistants.retrieve(openaiId);
    } catch {
      return null;
    }
  }

  // Listar todos os Assistants da conta
  async listAssistants(): Promise<OpenAI.Beta.Assistants.Assistant[]> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    const response = await this.client.beta.assistants.list({ limit: 100 });
    return response.data;
  }

  // Atualizar Assistant
  async updateAssistant(
    id: string,
    updates: Partial<{ name: string; instructions: string; model: string }>
  ): Promise<OpenAI.Beta.Assistants.Assistant> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    const openaiId = this.assistantsMap.get(id) || id;
    return this.client.beta.assistants.update(openaiId, updates);
  }

  // ============================================
  // THREADS (Memória)
  // ============================================

  // Criar nova thread para um assistant
  async createThread(
    assistantId: string,
    userId: string,
    title: string = 'Nova conversa'
  ): Promise<ThreadData> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    const thread = await this.client.beta.threads.create();

    const threadData: ThreadData = {
      id: `thread_${Date.now()}`,
      assistant_id: assistantId,
      openai_thread_id: thread.id,
      user_id: userId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Adicionar ao mapa
    const existingThreads = this.threadsMap.get(assistantId) || [];
    existingThreads.push(threadData);
    this.threadsMap.set(assistantId, existingThreads);
    this.saveToStorage();

    return threadData;
  }

  // Buscar thread existente ou criar nova
  async getOrCreateThread(
    assistantId: string,
    userId: string
  ): Promise<ThreadData> {
    const threads = this.threadsMap.get(assistantId) || [];
    const existingThread = threads.find(t => t.user_id === userId);

    if (existingThread) {
      return existingThread;
    }

    return this.createThread(assistantId, userId);
  }

  // Listar threads de um assistant
  getThreads(assistantId: string): ThreadData[] {
    return this.threadsMap.get(assistantId) || [];
  }

  // ============================================
  // MENSAGENS E EXECUÇÃO
  // ============================================

  // Enviar mensagem e aguardar resposta
  async sendMessage(
    threadId: string,
    assistantId: string,
    message: string
  ): Promise<string> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    // Resolver IDs
    const openaiThreadId = this.getOpenAIThreadId(threadId);
    const openaiAssistantId = this.assistantsMap.get(assistantId) || assistantId;

    // Adicionar mensagem do usuário
    await this.client.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content: message,
    });

    // Criar e executar run
    const run = await this.client.beta.threads.runs.create(openaiThreadId, {
      assistant_id: openaiAssistantId,
    });

    // Aguardar conclusão
    const completedRun = await this.waitForRun(openaiThreadId, run.id);

    if (completedRun.status !== 'completed') {
      throw new Error(`Run failed: ${completedRun.status}`);
    }

    // Buscar resposta
    const messages = await this.client.beta.threads.messages.list(openaiThreadId, {
      limit: 1,
      order: 'desc',
    });

    const assistantMessage = messages.data[0];
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      throw new Error('Nenhuma resposta do assistant');
    }

    // Extrair texto da resposta
    let response = '';
    for (const content of assistantMessage.content) {
      if (content.type === 'text') {
        response += content.text.value;
      }
    }

    // Atualizar timestamp da thread
    this.updateThreadTimestamp(threadId, assistantId);

    return response;
  }

  // Aguardar conclusão do run (polling)
  private async waitForRun(
    threadId: string,
    runId: string,
    maxWait = 120000
  ): Promise<OpenAI.Beta.Threads.Runs.Run> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      const run = await this.client.beta.threads.runs.retrieve(threadId, runId);

      if (['completed', 'failed', 'cancelled', 'expired'].includes(run.status)) {
        return run;
      }

      // Aguardar 1 segundo antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Timeout aguardando resposta do assistant');
  }

  // Helper para buscar thread ID do OpenAI
  private getOpenAIThreadId(localThreadId: string): string {
    for (const threads of this.threadsMap.values()) {
      const thread = threads.find(t => t.id === localThreadId);
      if (thread) return thread.openai_thread_id;
    }
    // Se não encontrou, assume que é o ID do OpenAI
    return localThreadId;
  }

  // Atualizar timestamp da thread
  private updateThreadTimestamp(threadId: string, assistantId: string) {
    const threads = this.threadsMap.get(assistantId);
    if (threads) {
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        thread.updated_at = new Date().toISOString();
        this.saveToStorage();
      }
    }
  }

  // ============================================
  // STREAMING (para respostas em tempo real)
  // ============================================

  async *streamMessage(
    threadId: string,
    assistantId: string,
    message: string
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client) throw new Error('OpenAI client não inicializado');

    const openaiThreadId = this.getOpenAIThreadId(threadId);
    const openaiAssistantId = this.assistantsMap.get(assistantId) || assistantId;

    // Adicionar mensagem
    await this.client.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content: message,
    });

    // Criar stream
    const stream = this.client.beta.threads.runs.stream(openaiThreadId, {
      assistant_id: openaiAssistantId,
    });

    for await (const event of stream) {
      if (event.event === 'thread.message.delta') {
        const delta = event.data.delta;
        if (delta.content) {
          for (const content of delta.content) {
            if (content.type === 'text' && content.text?.value) {
              yield content.text.value;
            }
          }
        }
      }
    }

    this.updateThreadTimestamp(threadId, assistantId);
  }

  // ============================================
  // UTILITÁRIOS
  // ============================================

  // Limpar memória de um assistant
  clearAssistantMemory(assistantId: string) {
    this.threadsMap.delete(assistantId);
    this.saveToStorage();
  }

  // Obter mapeamento de assistants
  getAssistantsMap(): Map<string, string> {
    return new Map(this.assistantsMap);
  }
}

export const openaiAssistantsServiceV2 = new OpenAIAssistantsServiceV2();
export default openaiAssistantsServiceV2;
