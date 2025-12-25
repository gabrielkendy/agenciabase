// Workflow Automation Service - Integra com n8n
// Dispara automações quando eventos acontecem no sistema

import { n8nService } from './n8nService';
import { zapiService, NotificationTrigger, NOTIFICATION_TRIGGERS } from './zapiService';
import { DemandStatus, Client, Demand } from '../types';

export interface AutomationConfig {
  enableN8n: boolean;
  enableDirectZapi: boolean;
  enableEmail: boolean;
  zapiInstance?: string;
  zapiToken?: string;
  zapiClientToken?: string;
  emailFrom?: string;
}

// Configuração padrão
let automationConfig: AutomationConfig = {
  enableN8n: true,
  enableDirectZapi: false,
  enableEmail: true,
};

// Mapeamento de status para triggers
const STATUS_TO_TRIGGER: Record<DemandStatus, NotificationTrigger | null> = {
  'briefing': 'demand_created',
  'doing': null,
  'internal_review': 'internal_approval_pending',
  'internal_approved': 'internal_approved',
  'waiting_approval': 'client_approval_pending',
  'approved': 'client_approved',
  'adjustment': 'client_adjustment_requested',
  'scheduled': 'demand_scheduled',
  'published': 'demand_published',
};

class WorkflowAutomationService {
  private config: AutomationConfig = automationConfig;

  setConfig(config: Partial<AutomationConfig>) {
    this.config = { ...this.config, ...config };
    
    // Configurar Z-API se necessário
    if (config.zapiInstance && config.zapiToken) {
      zapiService.setConfig({
        instanceId: config.zapiInstance,
        token: config.zapiToken,
        clientToken: config.zapiClientToken,
      });
    }
  }

  getConfig(): AutomationConfig {
    return this.config;
  }

  // ============================================
  // EVENTOS DE DEMANDA
  // ============================================

  // Quando uma demanda é criada
  async onDemandCreated(demand: Demand, client: Client): Promise<void> {
    console.log('[Automation] Demanda criada:', demand.title);

    const payload = this.buildDemandPayload(demand, client);

    // Notificar via n8n
    if (this.config.enableN8n) {
      try {
        await n8nService.notifyDemandCreated(payload);
      } catch (error) {
        console.error('[Automation] Erro n8n:', error);
      }
    }

    // Notificar diretamente via Z-API
    if (this.config.enableDirectZapi && client.phone) {
      try {
        const template = NOTIFICATION_TRIGGERS.find(t => t.id === 'demand_created');
        if (template) {
          const message = zapiService.replaceVariables(template.defaultMessage, {
            cliente_nome: client.name,
            demanda_titulo: demand.title,
            demanda_tipo: demand.content_type,
          });
          await zapiService.sendText(client.phone, message);
        }
      } catch (error) {
        console.error('[Automation] Erro Z-API:', error);
      }
    }
  }

  // Quando o status de uma demanda muda
  async onStatusChange(
    demand: Demand,
    client: Client,
    oldStatus: DemandStatus,
    newStatus: DemandStatus
  ): Promise<void> {
    console.log(`[Automation] Status mudou: ${oldStatus} -> ${newStatus}`);

    const trigger = STATUS_TO_TRIGGER[newStatus];
    if (!trigger) return;

    const payload = this.buildDemandPayload(demand, client);

    // Notificar via n8n
    if (this.config.enableN8n) {
      try {
        await n8nService.notifyStatusChange(demand.id, oldStatus, newStatus, payload);
      } catch (error) {
        console.error('[Automation] Erro n8n:', error);
      }
    }

    // Ações específicas por status
    switch (newStatus) {
      case 'waiting_approval':
        await this.notifyClientForApproval(demand, client);
        break;
      case 'approved':
        await this.notifyTeamApproved(demand, client);
        break;
      case 'adjustment':
        await this.notifyTeamAdjustment(demand, client);
        break;
      case 'published':
        await this.notifyClientPublished(demand, client);
        break;
    }
  }

  // ============================================
  // NOTIFICAÇÕES ESPECÍFICAS
  // ============================================

  // Notificar cliente para aprovar
  private async notifyClientForApproval(demand: Demand, client: Client): Promise<void> {
    if (!client.phone && !client.email) return;

    const approvalLink = `${window.location.origin}/aprovar/${demand.approval_token}`;
    
    const template = NOTIFICATION_TRIGGERS.find(t => t.id === 'client_approval_pending');
    if (!template) return;

    const variables = {
      cliente_nome: client.name,
      demanda_titulo: demand.title,
      link_aprovacao: approvalLink,
    };

    const message = zapiService.replaceVariables(template.defaultMessage, variables);

    // WhatsApp
    if (this.config.enableDirectZapi && client.phone) {
      try {
        await zapiService.sendLink(client.phone, message, approvalLink, 'Aprovar conteúdo');
      } catch (error) {
        console.error('[Automation] Erro ao enviar WhatsApp:', error);
      }
    }

    // Email via n8n
    if (this.config.enableN8n && this.config.enableEmail && client.email) {
      try {
        const htmlContent = `
          <h2>Olá ${client.name}!</h2>
          <p>Seu conteúdo está pronto para aprovação:</p>
          <p><strong>${demand.title}</strong></p>
          <p><a href="${approvalLink}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Aprovar Conteúdo</a></p>
        `;
        await n8nService.sendEmail(client.email, `Aprovação: ${demand.title}`, htmlContent);
      } catch (error) {
        console.error('[Automation] Erro ao enviar email:', error);
      }
    }
  }

  // Notificar equipe que foi aprovado
  private async notifyTeamApproved(demand: Demand, client: Client): Promise<void> {
    console.log(`[Automation] Notificar equipe: ${demand.title} foi APROVADO`);
    
    // Aqui você pode adicionar notificação para a equipe
    // Por exemplo, enviar para um grupo de WhatsApp ou email da equipe
  }

  // Notificar equipe que precisa de ajuste
  private async notifyTeamAdjustment(demand: Demand, client: Client): Promise<void> {
    console.log(`[Automation] Notificar equipe: ${demand.title} precisa de AJUSTE`);
    
    // Notificar equipe sobre o ajuste solicitado
  }

  // Notificar cliente que foi publicado
  private async notifyClientPublished(demand: Demand, client: Client): Promise<void> {
    if (!client.phone) return;

    const template = NOTIFICATION_TRIGGERS.find(t => t.id === 'demand_published');
    if (!template) return;

    const message = zapiService.replaceVariables(template.defaultMessage, {
      cliente_nome: client.name,
      demanda_titulo: demand.title,
    });

    if (this.config.enableDirectZapi && client.phone) {
      try {
        await zapiService.sendText(client.phone, message);
      } catch (error) {
        console.error('[Automation] Erro ao notificar publicação:', error);
      }
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  private buildDemandPayload(demand: Demand, client: Client) {
    return {
      demand_id: demand.id,
      demand_title: demand.title,
      client_id: client.id,
      client_name: client.name,
      client_email: client.email,
      client_phone: client.phone,
      content_type: demand.content_type,
      status: demand.status,
      approval_link: `${window.location.origin}/aprovar/${demand.approval_token}`,
      zapi_instance: this.config.zapiInstance,
      zapi_token: this.config.zapiToken,
    };
  }

  // Testar conexões
  async testConnections(): Promise<{
    n8n: boolean;
    zapi: boolean;
    email: boolean;
  }> {
    const results = {
      n8n: false,
      zapi: false,
      email: false,
    };

    // Testar n8n
    try {
      const n8nTest = await n8nService.testConnection();
      results.n8n = n8nTest.connected;
    } catch {
      results.n8n = false;
    }

    // Testar Z-API
    if (this.config.enableDirectZapi) {
      try {
        results.zapi = await zapiService.isConnected();
      } catch {
        results.zapi = false;
      }
    }

    // Email depende do n8n estar funcionando
    results.email = results.n8n && this.config.enableEmail;

    return results;
  }
}

export const workflowAutomation = new WorkflowAutomationService();
export default workflowAutomation;
