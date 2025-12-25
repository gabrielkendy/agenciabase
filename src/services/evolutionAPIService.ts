// Evolution API Service - WhatsApp Integration
// https://github.com/EvolutionAPI/evolution-api
// API para envio de mensagens WhatsApp

export interface EvolutionConfig {
  baseUrl: string; // URL da sua instância Evolution API
  apiKey: string;
  instanceName: string;
}

export interface SendTextMessage {
  number: string;
  text: string;
  delay?: number;
}

export interface SendMediaMessage {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  caption?: string;
  media: string; // URL ou base64
  fileName?: string;
}

export interface SendButtonMessage {
  number: string;
  title: string;
  description: string;
  footer?: string;
  buttons: Array<{ buttonId: string; buttonText: { displayText: string } }>;
}

export interface SendListMessage {
  number: string;
  title: string;
  description: string;
  buttonText: string;
  footerText?: string;
  sections: Array<{
    title: string;
    rows: Array<{ title: string; description?: string; rowId: string }>;
  }>;
}

export interface InstanceStatus {
  instanceName: string;
  state: 'open' | 'close' | 'connecting';
  status: string;
}

export interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

class EvolutionAPIService {
  private config: EvolutionConfig | null = null;

  setConfig(config: EvolutionConfig) {
    this.config = config;
  }

  getConfig(): EvolutionConfig | null {
    return this.config;
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown
  ): Promise<T> {
    if (!this.config) {
      throw new Error('Evolution API não configurada. Configure primeiro com setConfig()');
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      console.error('[EvolutionAPI] Erro:', error);
      throw error;
    }
  }

  // ============================================
  // INSTANCE MANAGEMENT
  // ============================================

  async createInstance(instanceName: string, options?: {
    token?: string;
    qrcode?: boolean;
    integration?: string;
  }): Promise<{ instance: { instanceName: string; status: string }; hash: string; qrcode?: QRCodeResponse }> {
    return this.request('/instance/create', 'POST', {
      instanceName,
      ...options,
    });
  }

  async getInstanceStatus(): Promise<InstanceStatus> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/instance/connectionState/${this.config.instanceName}`);
  }

  async getQRCode(): Promise<QRCodeResponse> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/instance/connect/${this.config.instanceName}`);
  }

  async logout(): Promise<{ status: string }> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/instance/logout/${this.config.instanceName}`, 'DELETE');
  }

  async restart(): Promise<{ status: string }> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/instance/restart/${this.config.instanceName}`, 'PUT');
  }

  async deleteInstance(): Promise<{ status: string }> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/instance/delete/${this.config.instanceName}`, 'DELETE');
  }

  async fetchInstances(): Promise<Array<{ instance: { instanceName: string; owner: string; status: string } }>> {
    return this.request('/instance/fetchInstances');
  }

  // ============================================
  // MESSAGES
  // ============================================

  async sendText(number: string, text: string, delay?: number): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(number);
    
    return this.request(`/message/sendText/${this.config.instanceName}`, 'POST', {
      number: formattedNumber,
      text,
      delay: delay || 1200,
    });
  }

  async sendMedia(params: SendMediaMessage): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(params.number);
    
    return this.request(`/message/sendMedia/${this.config.instanceName}`, 'POST', {
      ...params,
      number: formattedNumber,
    });
  }

  async sendImage(number: string, imageUrl: string, caption?: string): Promise<{ key: { id: string }; status: string }> {
    return this.sendMedia({
      number,
      mediatype: 'image',
      mimetype: 'image/jpeg',
      caption,
      media: imageUrl,
    });
  }

  async sendDocument(number: string, documentUrl: string, fileName: string, caption?: string): Promise<{ key: { id: string }; status: string }> {
    return this.sendMedia({
      number,
      mediatype: 'document',
      mimetype: 'application/pdf',
      caption,
      media: documentUrl,
      fileName,
    });
  }

  async sendButtons(params: SendButtonMessage): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(params.number);
    
    return this.request(`/message/sendButtons/${this.config.instanceName}`, 'POST', {
      ...params,
      number: formattedNumber,
    });
  }

  async sendList(params: SendListMessage): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(params.number);
    
    return this.request(`/message/sendList/${this.config.instanceName}`, 'POST', {
      ...params,
      number: formattedNumber,
    });
  }

  async sendLocation(
    number: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(number);
    
    return this.request(`/message/sendLocation/${this.config.instanceName}`, 'POST', {
      number: formattedNumber,
      latitude,
      longitude,
      name,
      address,
    });
  }

  async sendLinkPreview(
    number: string,
    text: string,
    linkUrl: string
  ): Promise<{ key: { id: string }; status: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(number);
    
    return this.request(`/message/sendText/${this.config.instanceName}`, 'POST', {
      number: formattedNumber,
      text: `${text}\n\n${linkUrl}`,
      linkPreview: true,
    });
  }

  // ============================================
  // CONTACTS & PROFILE
  // ============================================

  async checkNumberExists(number: string): Promise<{ exists: boolean; jid: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(number);
    
    return this.request(`/chat/whatsappNumbers/${this.config.instanceName}`, 'POST', {
      numbers: [formattedNumber],
    });
  }

  async getProfilePicture(number: string): Promise<{ profilePictureUrl: string }> {
    if (!this.config) throw new Error('Config não definida');
    
    const formattedNumber = this.formatNumber(number);
    
    return this.request(`/chat/fetchProfilePictureUrl/${this.config.instanceName}`, 'POST', {
      number: formattedNumber,
    });
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  async setWebhook(webhookUrl: string, events?: string[]): Promise<{ webhook: { url: string; events: string[] } }> {
    if (!this.config) throw new Error('Config não definida');
    
    return this.request(`/webhook/set/${this.config.instanceName}`, 'POST', {
      url: webhookUrl,
      webhook_by_events: true,
      webhook_base64: true,
      events: events || [
        'QRCODE_UPDATED',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CONNECTION_UPDATE',
      ],
    });
  }

  async getWebhook(): Promise<{ webhook: { url: string; events: string[] } }> {
    if (!this.config) throw new Error('Config não definida');
    return this.request(`/webhook/find/${this.config.instanceName}`);
  }

  // ============================================
  // HELPERS
  // ============================================

  private formatNumber(number: string): string {
    // Remove tudo que não é número
    let cleaned = number.replace(/\D/g, '');
    
    // Se começa com 0, remove
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Adiciona código do Brasil se não tiver
    if (cleaned.length === 11 || cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  // Verificar se está conectado
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.getInstanceStatus();
      return status.state === 'open';
    } catch {
      return false;
    }
  }

  // Substituir variáveis em template
  replaceVariables(template: string, data: Record<string, string>): string {
    let message = template;
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    });
    return message;
  }
}

export const evolutionAPI = new EvolutionAPIService();
export default evolutionAPI;
