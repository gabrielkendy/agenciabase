// =============================================================================
// WEBHOOKS SERVICE - Integração com n8n
// =============================================================================

const N8N_WEBHOOK_BASE = 'https://agenciabase.app.n8n.cloud/webhook';

// Função genérica para trigger de webhooks
export const triggerWebhook = async (
  path: string,
  data: Record<string, any>,
  options: { silent?: boolean } = {}
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await fetch(`${N8N_WEBHOOK_BASE}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'base-agency-saas'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json().catch(() => ({}));
    return { success: true, data: result };
  } catch (error: any) {
    if (!options.silent) {
      console.error(`[Webhook ${path}] Error:`, error.message);
    }
    return { success: false, error: error.message };
  }
};

// =============================================================================
// WEBHOOKS DE DEMANDAS
// =============================================================================

export const demandWebhooks = {
  // Quando uma demanda é criada
  created: (demand: any, client: any) => triggerWebhook('demanda-criada', {
    demand_id: demand.id,
    title: demand.title,
    content_type: demand.content_type,
    channels: demand.channels,
    client_id: client?.id,
    client_name: client?.name,
    client_phone: client?.phone,
    client_email: client?.email,
  }),

  // Quando o status muda
  statusChanged: (demand: any, oldStatus: string, newStatus: string, userName: string) => 
    triggerWebhook('status-alterado', {
      demand_id: demand.id,
      title: demand.title,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userName,
    }),

  // Quando enviado para aprovação do cliente
  sentToClientApproval: (demand: any, client: any, approvalLink: string) =>
    triggerWebhook('aprovacao-cliente', {
      demand_id: demand.id,
      title: demand.title,
      client_name: client?.name,
      client_phone: client?.phone,
      client_email: client?.email,
      approval_link: approvalLink,
    }),

  // Quando demanda é publicada
  published: (demand: any, results: any[]) => triggerWebhook('publicado', {
    demand_id: demand.id,
    title: demand.title,
    channels: demand.channels,
    publish_results: results,
  }),
};

// =============================================================================
// WEBHOOKS DE APROVAÇÃO
// =============================================================================

export const approvalWebhooks = {
  // Aprovação interna
  internalApproved: (demand: any, approver: any) => triggerWebhook('aprovacao-interna', {
    action: 'approve',
    demand_id: demand.id,
    title: demand.title,
    approver_id: approver.id,
    approver_name: approver.name,
  }),

  // Rejeição interna
  internalRejected: (demand: any, approver: any, feedback: string) => 
    triggerWebhook('aprovacao-interna', {
      action: 'reject',
      demand_id: demand.id,
      title: demand.title,
      approver_id: approver.id,
      approver_name: approver.name,
      feedback,
    }),

  // Cliente aprovou
  clientApproved: (demand: any, client: any) => triggerWebhook('aprovacao', {
    action: 'approve',
    demand_id: demand.id,
    title: demand.title,
    client_name: client?.name,
  }),

  // Cliente pediu ajustes
  clientRequestedAdjustment: (demand: any, client: any, feedback: string) =>
    triggerWebhook('aprovacao', {
      action: 'request_adjustment',
      demand_id: demand.id,
      title: demand.title,
      client_name: client?.name,
      feedback,
    }),
};

// =============================================================================
// WEBHOOKS DE PAGAMENTO
// =============================================================================

export const paymentWebhooks = {
  // Cobrança gerada
  invoiceCreated: (client: any, invoice: any) => triggerWebhook('cobranca-criada', {
    client_id: client.id,
    client_name: client.name,
    client_phone: client.phone,
    invoice_id: invoice.id,
    value: invoice.value,
    due_date: invoice.dueDate,
    payment_link: invoice.invoiceUrl,
  }),

  // Pagamento confirmado
  paymentConfirmed: (client: any, payment: any) => triggerWebhook('pagamento', {
    event: 'confirmed',
    client_id: client.id,
    client_name: client.name,
    payment_id: payment.id,
    value: payment.value,
  }),
};

// =============================================================================
// WEBHOOKS DE IA
// =============================================================================

export const aiWebhooks = {
  // Gerar conteúdo
  generateContent: async (prompt: string, options: {
    type?: 'post' | 'caption' | 'script' | 'email';
    platform?: string;
    tone?: 'formal' | 'casual' | 'funny';
  } = {}) => {
    return triggerWebhook('gerar-conteudo', {
      prompt,
      type: options.type || 'post',
      platform: options.platform || 'instagram',
      tone: options.tone || 'casual',
    });
  },

  // Analisar sentimento
  analyzeSentiment: async (text: string) => {
    return triggerWebhook('analisar-sentimento', { text });
  },
};

// =============================================================================
// WEBHOOKS DE NOTIFICAÇÃO
// =============================================================================

export const notificationWebhooks = {
  // Enviar notificação por email
  sendEmail: (to: string, subject: string, body: string) => 
    triggerWebhook('notificar-email', { to, subject, body }),

  // Enviar WhatsApp
  sendWhatsApp: (phone: string, message: string) =>
    triggerWebhook('notificar-whatsapp', { phone, message }),
};

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  trigger: triggerWebhook,
  demand: demandWebhooks,
  approval: approvalWebhooks,
  payment: paymentWebhooks,
  ai: aiWebhooks,
  notification: notificationWebhooks,
};
