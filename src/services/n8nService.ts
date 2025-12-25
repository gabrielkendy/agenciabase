// n8n Integration Service
// Integra o frontend com workflows do n8n via webhooks

export interface N8nConfig {
  baseUrl: string; // https://agenciabase.app.n8n.cloud
  webhookPath: string; // /webhook ou /webhook-test
  accessToken?: string;
}

export interface WebhookPayload {
  [key: string]: unknown;
}

export interface DemandNotificationPayload {
  demand_id: string;
  demand_title: string;
  client_id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  content_type: string;
  status: string;
  approval_link?: string;
  zapi_instance?: string;
  zapi_token?: string;
}

export interface ApprovalPayload {
  demand_id: string;
  token: string;
  action: 'approve' | 'request_adjustment';
  approved_by?: string;
  feedback?: string;
}

class N8nService {
  private config: N8nConfig = {
    baseUrl: 'https://agenciabase.app.n8n.cloud',
    webhookPath: '/webhook',
  };

  setConfig(config: Partial<N8nConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): N8nConfig {
    return this.config;
  }

  private async callWebhook<T>(
    endpoint: string,
    payload: WebhookPayload
  ): Promise<T> {
    const url = `${this.config.baseUrl}${this.config.webhookPath}/${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`n8n error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error) {
      console.error('n8n webhook error:', error);
      throw error;
    }
  }

  // ============================================
  // NOTIFICAÇÕES
  // ============================================

  // Enviar notificação WhatsApp
  async sendWhatsApp(phone: string, message: string, zapiConfig?: { instance: string; token: string }): Promise<{ success: boolean; messageId?: string }> {
    return this.callWebhook('notificar-whatsapp', {
      phone,
      message,
      zapi_instance: zapiConfig?.instance,
      zapi_token: zapiConfig?.token,
    });
  }

  // Enviar notificação Email
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<{ success: boolean }> {
    return this.callWebhook('notificar-email', {
      to_email: to,
      subject,
      html_content: htmlContent,
    });
  }

  // ============================================
  // DEMANDAS
  // ============================================

  // Notificar quando demanda é criada
  async notifyDemandCreated(payload: DemandNotificationPayload): Promise<{ success: boolean }> {
    return this.callWebhook('demanda-criada', payload);
  }

  // Notificar mudança de status
  async notifyStatusChange(
    demandId: string,
    oldStatus: string,
    newStatus: string,
    payload: Partial<DemandNotificationPayload>
  ): Promise<{ success: boolean }> {
    return this.callWebhook('status-changed', {
      demand_id: demandId,
      old_status: oldStatus,
      new_status: newStatus,
      ...payload,
    });
  }

  // ============================================
  // APROVAÇÕES
  // ============================================

  // Processar aprovação do cliente
  async processApproval(payload: ApprovalPayload): Promise<{ success: boolean; action: string }> {
    return this.callWebhook('aprovacao-cliente', payload);
  }

  // ============================================
  // AGENDAMENTO / PUBLICAÇÃO
  // ============================================

  // Agendar publicação
  async schedulePublication(
    demandId: string,
    scheduledDate: string,
    platforms: string[],
    content: {
      text?: string;
      imageUrl?: string;
      videoUrl?: string;
    }
  ): Promise<{ success: boolean; scheduledId?: string }> {
    return this.callWebhook('agendar-publicacao', {
      demand_id: demandId,
      scheduled_date: scheduledDate,
      platforms,
      content,
    });
  }

  // ============================================
  // OPENAI ASSISTANTS (via n8n)
  // ============================================

  // Chat com Assistant via n8n
  async chatWithAssistant(
    assistantId: string,
    message: string,
    threadId?: string
  ): Promise<{ response: string; threadId: string }> {
    return this.callWebhook('chat-assistant', {
      assistant_id: assistantId,
      message,
      thread_id: threadId,
    });
  }

  // Criar novo Assistant via n8n
  async createAssistant(
    name: string,
    instructions: string,
    model: string = 'gpt-4-turbo-preview'
  ): Promise<{ assistantId: string; name: string }> {
    return this.callWebhook('criar-assistant', {
      name,
      instructions,
      model,
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  // Testar conexão com n8n
  async testConnection(): Promise<{ connected: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/healthz`);
      return { connected: response.ok };
    } catch {
      return { connected: false };
    }
  }

  // Verificar se webhook está ativo
  async pingWebhook(endpoint: string): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}${this.config.webhookPath}/${endpoint}`;
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok || response.status === 405; // 405 = método não permitido, mas webhook existe
    } catch {
      return false;
    }
  }
}

export const n8nService = new N8nService();

// Export default instance
export default n8nService;
