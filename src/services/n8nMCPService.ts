// n8n MCP Service - Integração via Model Context Protocol
// Conecta o frontend diretamente com n8n Cloud

export interface N8nMCPConfig {
  baseUrl: string;
  apiKey?: string;
  webhookPath: string;
}

export interface WebhookPayload {
  [key: string]: any;
}

export interface WorkflowExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'running' | 'success' | 'error' | 'waiting';
  data?: any;
}

// Endpoints de webhook disponíveis
export const N8N_WEBHOOKS = {
  // Notificações
  STATUS_CHANGED_EMAIL: 'status-changed-email',
  WHATSAPP_NOTIFY: 'whatsapp-notify',
  
  // Aprovação
  CLIENT_APPROVAL: 'client-approval',
  
  // Autenticação
  AUTH_LOGIN: 'auth/login',
  AUTH_VERIFY_TOKEN: 'auth/verify-token',
  AUTH_LOGOUT: 'auth/logout',
  
  // Agendamento
  SCHEDULE_PUBLISH: 'schedule-publish',
  
  // Demandas
  DEMAND_CREATED: 'demanda-criada',
} as const;

class N8nMCPService {
  private config: N8nMCPConfig = {
    baseUrl: 'https://agenciabase.app.n8n.cloud',
    webhookPath: '/webhook',
  };

  // Configurar n8n
  setConfig(config: Partial<N8nMCPConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): N8nMCPConfig {
    return this.config;
  }

  // Construir URL do webhook
  private buildWebhookUrl(endpoint: string): string {
    const { baseUrl, webhookPath } = this.config;
    return `${baseUrl}${webhookPath}/${endpoint}`;
  }

  // Chamar webhook genérico
  async callWebhook<T = any>(
    endpoint: string,
    payload: WebhookPayload,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
    }
  ): Promise<T> {
    const url = this.buildWebhookUrl(endpoint);
    const method = options?.method || 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: method !== 'GET' ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`[n8n MCP] Erro ao chamar ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================
  // NOTIFICAÇÕES
  // ============================================

  // Notificar mudança de status por email
  async notifyStatusChangeEmail(data: {
    demand_id: string;
    demand_title: string;
    client_name: string;
    client_email: string;
    team_email?: string;
    new_status: string;
    updated_by?: string;
    approval_link?: string;
    post_url?: string;
  }): Promise<{ success: boolean }> {
    return this.callWebhook(N8N_WEBHOOKS.STATUS_CHANGED_EMAIL, data);
  }

  // Enviar notificação WhatsApp
  async sendWhatsAppNotification(data: {
    phone: string;
    message: string;
    type?: 'status_update' | 'approval_request' | 'deadline_reminder' | 'published' | 'feedback';
    demand_id?: string;
    link?: string;
  }): Promise<{ success: boolean; message_id?: string }> {
    return this.callWebhook(N8N_WEBHOOKS.WHATSAPP_NOTIFY, data);
  }

  // ============================================
  // APROVAÇÃO
  // ============================================

  // Processar aprovação do cliente
  async processClientApproval(data: {
    demand_id: string;
    token: string;
    action: 'approve' | 'request_adjustment';
    approved_by?: string;
    client_name?: string;
    feedback?: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.callWebhook(N8N_WEBHOOKS.CLIENT_APPROVAL, data);
  }

  // ============================================
  // AUTENTICAÇÃO
  // ============================================

  // Login
  async login(
    email: string,
    password: string
  ): Promise<{
    success: boolean;
    token?: string;
    user?: {
      id: string;
      name: string;
      email: string;
      role: string;
      tenant_id: string;
    };
    error?: string;
  }> {
    return this.callWebhook(N8N_WEBHOOKS.AUTH_LOGIN, { email, password });
  }

  // Verificar token
  async verifyToken(token: string): Promise<{
    valid: boolean;
    user?: {
      id: string;
      email: string;
      role: string;
      tenant_id: string;
    };
    error?: string;
  }> {
    return this.callWebhook(
      N8N_WEBHOOKS.AUTH_VERIFY_TOKEN,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  // Logout
  async logout(userId: string): Promise<{ success: boolean }> {
    return this.callWebhook(N8N_WEBHOOKS.AUTH_LOGOUT, { user_id: userId });
  }

  // ============================================
  // AGENDAMENTO
  // ============================================

  // Agendar publicação
  async schedulePublication(data: {
    demand_id: string;
    scheduled_date: string; // ISO date string
    scheduled_by?: string;
  }): Promise<{ success: boolean; scheduled_date: string }> {
    return this.callWebhook(N8N_WEBHOOKS.SCHEDULE_PUBLISH, data);
  }

  // ============================================
  // DEMANDAS
  // ============================================

  // Notificar criação de demanda
  async notifyDemandCreated(data: {
    demand_id: string;
    demand_title: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    content_type: string;
    channels: string[];
    approval_link: string;
  }): Promise<{ success: boolean }> {
    return this.callWebhook(N8N_WEBHOOKS.DEMAND_CREATED, data);
  }

  // ============================================
  // HELPERS
  // ============================================

  // Testar conexão com n8n
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      // Tentar chamar um endpoint de teste
      const response = await fetch(`${this.config.baseUrl}/healthz`, {
        method: 'GET',
      });

      return {
        connected: response.ok,
        message: response.ok ? 'Conectado ao n8n' : 'Não foi possível conectar',
      };
    } catch (error) {
      return {
        connected: false,
        message: 'Erro de conexão com n8n',
      };
    }
  }

  // Obter URL do webhook
  getWebhookUrl(endpoint: string): string {
    return this.buildWebhookUrl(endpoint);
  }

  // Listar todos os webhooks disponíveis
  getAvailableWebhooks(): Record<string, string> {
    const webhooks: Record<string, string> = {};
    Object.entries(N8N_WEBHOOKS).forEach(([key, value]) => {
      webhooks[key] = this.buildWebhookUrl(value);
    });
    return webhooks;
  }
}

export const n8nMCPService = new N8nMCPService();
export default n8nMCPService;
