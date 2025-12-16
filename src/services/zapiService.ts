// Z-API Service - Integração WhatsApp
// Docs: https://developer.z-api.io/

export interface ZAPIConfig {
  instanceId: string;
  token: string;
  clientToken?: string;
}

export interface ZAPIMessage {
  phone: string;
  message: string;
}

export interface ZAPIMessageWithImage {
  phone: string;
  image: string;
  caption?: string;
}

export interface ZAPIMessageWithLink {
  phone: string;
  message: string;
  linkUrl: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImage?: string;
}

export interface ZAPIContact {
  id: string;
  name: string;
  phone: string;
  profilePicture?: string;
}

export interface ZAPIWebhookPayload {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  status: string;
  chatName: string;
  senderName: string;
  text?: { message: string };
  image?: { imageUrl: string; caption?: string };
}

// Templates de mensagens automáticas
export interface NotificationTemplate {
  id: string;
  name: string;
  trigger: NotificationTrigger;
  channel: 'whatsapp' | 'email' | 'both';
  message: string;
  isActive: boolean;
  variables: string[];
}

export type NotificationTrigger = 
  | 'demand_created'
  | 'demand_to_design'
  | 'demand_to_content'
  | 'internal_approval_pending'
  | 'internal_approved'
  | 'client_approval_pending'
  | 'client_approved'
  | 'client_adjustment_requested'
  | 'demand_scheduled'
  | 'demand_published'
  | 'payment_pending'
  | 'payment_received'
  | 'payment_overdue';

export const NOTIFICATION_TRIGGERS: { id: NotificationTrigger; label: string; description: string; defaultMessage: string }[] = [
  { id: 'demand_created', label: 'Demanda Criada', description: 'Quando uma nova demanda é criada', defaultMessage: '📋 Nova demanda criada!\n\n*{{demanda_titulo}}*\nCliente: {{cliente_nome}}\nTipo: {{demanda_tipo}}' },
  { id: 'demand_to_design', label: 'Enviado para Design', description: 'Quando demanda vai para o designer', defaultMessage: '🎨 Olá {{designer_nome}}!\n\nVocê recebeu uma nova demanda:\n*{{demanda_titulo}}*\n\nCliente: {{cliente_nome}}' },
  { id: 'demand_to_content', label: 'Enviado para Conteúdo', description: 'Quando demanda vai para redator', defaultMessage: '✍️ Olá {{redator_nome}}!\n\nVocê recebeu uma nova demanda:\n*{{demanda_titulo}}*\n\nCliente: {{cliente_nome}}' },
  { id: 'internal_approval_pending', label: 'Aprovação Interna Pendente', description: 'Quando precisa de aprovação interna', defaultMessage: '👀 Aprovação Interna Pendente\n\n*{{demanda_titulo}}*\nCliente: {{cliente_nome}}\n\nPor favor, revise e aprove.' },
  { id: 'internal_approved', label: 'Aprovação Interna OK', description: 'Quando aprovado internamente', defaultMessage: '✅ Demanda aprovada internamente!\n\n*{{demanda_titulo}}*\nPronte para enviar ao cliente.' },
  { id: 'client_approval_pending', label: 'Aprovação do Cliente', description: 'Quando enviado para cliente aprovar', defaultMessage: 'Olá {{cliente_nome}}! 👋\n\nSeu conteúdo está pronto para aprovação:\n*{{demanda_titulo}}*\n\n🔗 Clique para aprovar:\n{{link_aprovacao}}' },
  { id: 'client_approved', label: 'Cliente Aprovou', description: 'Quando cliente aprova o conteúdo', defaultMessage: '🎉 {{cliente_nome}} aprovou o conteúdo!\n\n*{{demanda_titulo}}*\n\nPronto para agendar/publicar.' },
  { id: 'client_adjustment_requested', label: 'Cliente Pediu Ajustes', description: 'Quando cliente solicita alterações', defaultMessage: '🔧 {{cliente_nome}} solicitou ajustes\n\n*{{demanda_titulo}}*\n\nPor favor, verifique os comentários.' },
  { id: 'demand_scheduled', label: 'Demanda Agendada', description: 'Quando post é agendado', defaultMessage: '📅 Post agendado!\n\n*{{demanda_titulo}}*\nData: {{data_agendamento}}' },
  { id: 'demand_published', label: 'Demanda Publicada', description: 'Quando post é publicado', defaultMessage: '🚀 Post publicado!\n\n*{{demanda_titulo}}*\n\nCliente: {{cliente_nome}}' },
  { id: 'payment_pending', label: 'Cobrança Gerada', description: 'Quando nova cobrança é criada', defaultMessage: 'Olá {{cliente_nome}}! 💰\n\nSua cobrança foi gerada:\n*Valor: {{valor_cobranca}}*\n\n🔗 Pague aqui:\n{{link_pagamento}}' },
  { id: 'payment_received', label: 'Pagamento Recebido', description: 'Quando pagamento é confirmado', defaultMessage: '✅ Pagamento confirmado!\n\nObrigado {{cliente_nome}}!\nValor: {{valor_cobranca}}' },
  { id: 'payment_overdue', label: 'Pagamento Atrasado', description: 'Quando pagamento está em atraso', defaultMessage: '⚠️ Olá {{cliente_nome}}\n\nIdentificamos que seu pagamento está em atraso:\n*Valor: {{valor_cobranca}}*\n\n🔗 Regularize aqui:\n{{link_pagamento}}' },
];

export const MESSAGE_VARIABLES = [
  { key: 'cliente_nome', description: 'Nome do cliente' },
  { key: 'cliente_empresa', description: 'Empresa do cliente' },
  { key: 'cliente_telefone', description: 'Telefone do cliente' },
  { key: 'demanda_titulo', description: 'Título da demanda' },
  { key: 'demanda_tipo', description: 'Tipo de conteúdo' },
  { key: 'demanda_status', description: 'Status atual' },
  { key: 'link_aprovacao', description: 'Link para aprovação' },
  { key: 'designer_nome', description: 'Nome do designer' },
  { key: 'redator_nome', description: 'Nome do redator' },
  { key: 'data_agendamento', description: 'Data do agendamento' },
  { key: 'valor_cobranca', description: 'Valor da cobrança' },
  { key: 'link_pagamento', description: 'Link de pagamento' },
  { key: 'agencia_nome', description: 'Nome da agência' },
];

class ZAPIService {
  private config: ZAPIConfig | null = null;
  private baseUrl = 'https://api.z-api.io';

  setConfig(config: ZAPIConfig) {
    this.config = config;
  }

  getConfig(): ZAPIConfig | null {
    return this.config;
  }

  private getUrl(endpoint: string): string {
    if (!this.config) throw new Error('Z-API não configurada');
    return `${this.baseUrl}/instances/${this.config.instanceId}/token/${this.config.token}${endpoint}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config) throw new Error('Z-API não configurada');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.clientToken) {
      headers['Client-Token'] = this.config.clientToken;
    }

    const response = await fetch(this.getUrl(endpoint), {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Erro Z-API: ${response.status}`);
    }

    return response.json();
  }

  // ========== STATUS ==========
  async getStatus(): Promise<{ connected: boolean; session: string }> {
    return this.request('/status');
  }

  async getQRCode(): Promise<{ value: string }> {
    return this.request('/qr-code/image');
  }

  async disconnect(): Promise<void> {
    await this.request('/disconnect', { method: 'POST' });
  }

  async restart(): Promise<void> {
    await this.request('/restart', { method: 'POST' });
  }

  // ========== MESSAGES ==========
  async sendText(phone: string, message: string): Promise<{ messageId: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request('/send-text', {
      method: 'POST',
      body: JSON.stringify({ phone: formattedPhone, message }),
    });
  }

  async sendImage(phone: string, imageUrl: string, caption?: string): Promise<{ messageId: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request('/send-image', {
      method: 'POST',
      body: JSON.stringify({ phone: formattedPhone, image: imageUrl, caption }),
    });
  }

  async sendLink(phone: string, message: string, linkUrl: string, linkTitle?: string): Promise<{ messageId: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request('/send-link', {
      method: 'POST',
      body: JSON.stringify({ 
        phone: formattedPhone, 
        message, 
        linkUrl,
        linkTitle: linkTitle || 'Clique aqui',
      }),
    });
  }

  async sendDocument(phone: string, documentUrl: string, documentName: string): Promise<{ messageId: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request('/send-document/url', {
      method: 'POST',
      body: JSON.stringify({ phone: formattedPhone, document: documentUrl, fileName: documentName }),
    });
  }

  async sendButtons(phone: string, message: string, buttons: { id: string; label: string }[]): Promise<{ messageId: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request('/send-button-list', {
      method: 'POST',
      body: JSON.stringify({ 
        phone: formattedPhone, 
        message,
        buttonList: { buttons: buttons.map(b => ({ id: b.id, label: b.label })) }
      }),
    });
  }

  // ========== CONTACTS ==========
  async getContacts(): Promise<ZAPIContact[]> {
    const result = await this.request<ZAPIContact[]>('/contacts');
    return result;
  }

  async getProfilePicture(phone: string): Promise<{ link: string }> {
    const formattedPhone = this.formatPhone(phone);
    return this.request(`/profile-picture?phone=${formattedPhone}`);
  }

  // ========== HELPERS ==========
  private formatPhone(phone: string): string {
    // Remove tudo que não é número
    let cleaned = phone.replace(/\D/g, '');
    
    // Adiciona código do país se não tiver
    if (cleaned.length === 11) {
      cleaned = '55' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }

  // Substitui variáveis na mensagem
  replaceVariables(template: string, data: Record<string, string>): string {
    let message = template;
    Object.entries(data).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    });
    return message;
  }

  // Validar se está conectado
  async isConnected(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.connected;
    } catch {
      return false;
    }
  }
}

export const zapiService = new ZAPIService();

// ========== NOTIFICATION MANAGER ==========
export class NotificationManager {
  private templates: NotificationTemplate[] = [];

  setTemplates(templates: NotificationTemplate[]) {
    this.templates = templates;
  }

  getTemplates(): NotificationTemplate[] {
    return this.templates;
  }

  async sendNotification(
    trigger: NotificationTrigger,
    data: Record<string, string>,
    phone?: string,
    email?: string
  ): Promise<void> {
    const template = this.templates.find(t => t.trigger === trigger && t.isActive);
    if (!template) return;

    const message = zapiService.replaceVariables(template.message, data);

    if ((template.channel === 'whatsapp' || template.channel === 'both') && phone) {
      try {
        await zapiService.sendText(phone, message);
      } catch (error) {
        console.error('Erro ao enviar WhatsApp:', error);
      }
    }

    if ((template.channel === 'email' || template.channel === 'both') && email) {
      // TODO: Implementar envio de email
      console.log('Email seria enviado para:', email, message);
    }
  }
}

export const notificationManager = new NotificationManager();
