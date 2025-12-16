// Email Service - Usando EmailJS ou similar (client-side)
// Para produção, use um backend com Nodemailer, SendGrid, ou AWS SES

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface EmailData {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
  reply_to?: string;
}

// Email Templates
export const EMAIL_TEMPLATES = {
  demand_created: {
    subject: 'Nova demanda criada: {{demanda_titulo}}',
    body: `Olá {{cliente_nome}},

Uma nova demanda foi criada para {{cliente_empresa}}:

📋 Título: {{demanda_titulo}}
📝 Tipo: {{demanda_tipo}}
📅 Criado em: {{data_criacao}}

Nossa equipe já está trabalhando nisso!

Atenciosamente,
{{agencia_nome}}`
  },
  client_approval_pending: {
    subject: 'Conteúdo aguardando sua aprovação: {{demanda_titulo}}',
    body: `Olá {{cliente_nome}},

Temos um conteúdo pronto para sua aprovação!

📋 Título: {{demanda_titulo}}
📝 Tipo: {{demanda_tipo}}

🔗 Clique no link abaixo para visualizar e aprovar:
{{link_aprovacao}}

Aguardamos seu feedback!

Atenciosamente,
{{agencia_nome}}`
  },
  client_approved: {
    subject: '✅ Conteúdo aprovado: {{demanda_titulo}}',
    body: `Olá,

O cliente {{cliente_nome}} aprovou a demanda "{{demanda_titulo}}"!

🎉 Status: Aprovado
📅 Aprovado em: {{data_aprovacao}}

O conteúdo será agendado/publicado conforme planejado.

Atenciosamente,
Sistema {{agencia_nome}}`
  },
  adjustment_requested: {
    subject: '🔧 Ajustes solicitados: {{demanda_titulo}}',
    body: `Olá,

O cliente {{cliente_nome}} solicitou ajustes na demanda "{{demanda_titulo}}".

📋 Feedback:
{{feedback}}

Por favor, verifique e faça os ajustes necessários.

Atenciosamente,
Sistema {{agencia_nome}}`
  },
  payment_pending: {
    subject: '💰 Cobrança gerada: {{valor_cobranca}}',
    body: `Olá {{cliente_nome}},

Uma nova cobrança foi gerada:

💰 Valor: {{valor_cobranca}}
📅 Vencimento: {{data_vencimento}}
🔗 Link de pagamento: {{link_pagamento}}

Obrigado pela parceria!

Atenciosamente,
{{agencia_nome}}`
  },
  payment_overdue: {
    subject: '⚠️ Cobrança vencida: {{valor_cobranca}}',
    body: `Olá {{cliente_nome}},

Identificamos que sua cobrança está vencida:

💰 Valor: {{valor_cobranca}}
📅 Vencimento: {{data_vencimento}}
🔗 Regularize aqui: {{link_pagamento}}

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
{{agencia_nome}}`
  },
  demand_published: {
    subject: '🚀 Conteúdo publicado: {{demanda_titulo}}',
    body: `Olá {{cliente_nome}},

Seu conteúdo foi publicado com sucesso!

📋 Título: {{demanda_titulo}}
📅 Publicado em: {{data_publicacao}}
📱 Redes: {{redes_sociais}}

Confira nas suas redes sociais!

Atenciosamente,
{{agencia_nome}}`
  }
};

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;

class EmailService {
  private config: EmailConfig | null = null;

  setConfig(config: EmailConfig) {
    this.config = config;
  }

  replaceVariables(template: string, data: Record<string, string>): string {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });
    return result;
  }

  async sendEmail(templateKey: EmailTemplateKey, variables: Record<string, string>, toEmail: string, toName: string): Promise<boolean> {
    const template = EMAIL_TEMPLATES[templateKey];
    if (!template) {
      console.error('Template not found:', templateKey);
      return false;
    }

    const subject = this.replaceVariables(template.subject, variables);
    const body = this.replaceVariables(template.body, variables);

    // Se usando EmailJS
    if (this.config) {
      try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: this.config.serviceId,
            template_id: this.config.templateId,
            user_id: this.config.publicKey,
            template_params: {
              to_email: toEmail,
              to_name: toName,
              subject,
              message: body
            }
          })
        });
        return response.ok;
      } catch (error) {
        console.error('Email send error:', error);
        return false;
      }
    }

    // Fallback: Log para desenvolvimento
    console.log('📧 Email (dev mode):', { to: toEmail, subject, body });
    return true;
  }

  // Métodos de conveniência
  async sendApprovalRequest(clientEmail: string, clientName: string, demandTitle: string, approvalLink: string, agencyName: string = 'Agência Base') {
    return this.sendEmail('client_approval_pending', {
      cliente_nome: clientName,
      demanda_titulo: demandTitle,
      demanda_tipo: 'Post',
      link_aprovacao: approvalLink,
      agencia_nome: agencyName
    }, clientEmail, clientName);
  }

  async sendAdjustmentNotification(teamEmail: string, clientName: string, demandTitle: string, feedback: string, agencyName: string = 'Agência Base') {
    return this.sendEmail('adjustment_requested', {
      cliente_nome: clientName,
      demanda_titulo: demandTitle,
      feedback,
      agencia_nome: agencyName
    }, teamEmail, 'Equipe');
  }

  async sendPaymentReminder(clientEmail: string, clientName: string, value: string, dueDate: string, paymentLink: string, agencyName: string = 'Agência Base', isOverdue: boolean = false) {
    return this.sendEmail(isOverdue ? 'payment_overdue' : 'payment_pending', {
      cliente_nome: clientName,
      valor_cobranca: value,
      data_vencimento: dueDate,
      link_pagamento: paymentLink,
      agencia_nome: agencyName
    }, clientEmail, clientName);
  }

  async sendPublishedNotification(clientEmail: string, clientName: string, demandTitle: string, channels: string[], agencyName: string = 'Agência Base') {
    return this.sendEmail('demand_published', {
      cliente_nome: clientName,
      demanda_titulo: demandTitle,
      data_publicacao: new Date().toLocaleDateString('pt-BR'),
      redes_sociais: channels.join(', '),
      agencia_nome: agencyName
    }, clientEmail, clientName);
  }
}

export const emailService = new EmailService();
