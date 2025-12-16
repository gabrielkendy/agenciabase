// Workflow Automation Service
// Gerencia automações e triggers no workflow

import { Demand, Client } from '../types';
import { notificationManager, NotificationTrigger } from './zapiService';
import { emailService, EmailTemplateKey } from './emailService';

export type AutomationTrigger = 
  | 'demand_created'
  | 'demand_status_changed'
  | 'demand_assigned'
  | 'approval_requested'
  | 'approval_received'
  | 'adjustment_requested'
  | 'demand_published'
  | 'payment_created'
  | 'payment_received'
  | 'payment_overdue';

export interface AutomationAction {
  type: 'send_whatsapp' | 'send_email' | 'move_to_column' | 'assign_team' | 'webhook';
  config: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  }[];
  actions: AutomationAction[];
  is_active: boolean;
}

// Default automation rules
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: '1',
    name: 'Notificar cliente quando demanda criada',
    trigger: 'demand_created',
    actions: [
      { type: 'send_whatsapp', config: { template: 'demand_created', to: 'client' } }
    ],
    is_active: true,
  },
  {
    id: '2',
    name: 'Enviar link de aprovação para cliente',
    trigger: 'approval_requested',
    actions: [
      { type: 'send_whatsapp', config: { template: 'client_approval_pending', to: 'client' } },
      { type: 'send_email', config: { template: 'client_approval_pending', to: 'client' } }
    ],
    is_active: true,
  },
  {
    id: '3',
    name: 'Mover para ajustes quando cliente solicitar',
    trigger: 'adjustment_requested',
    actions: [
      { type: 'move_to_column', config: { column: 'ajustes' } },
      { type: 'send_whatsapp', config: { template: 'client_adjustment_requested', to: 'team' } }
    ],
    is_active: true,
  },
  {
    id: '4',
    name: 'Notificar quando demanda publicada',
    trigger: 'demand_published',
    actions: [
      { type: 'send_whatsapp', config: { template: 'demand_published', to: 'client' } },
      { type: 'send_email', config: { template: 'demand_published', to: 'client' } }
    ],
    is_active: true,
  }
];

class WorkflowAutomation {
  private rules: AutomationRule[] = DEFAULT_AUTOMATION_RULES;
  private agencyName: string = 'Agência Base';

  setRules(rules: AutomationRule[]) {
    this.rules = rules;
  }

  setAgencyName(name: string) {
    this.agencyName = name;
  }

  // Build variables for templates
  private buildVariables(demand: Demand, client: Client, extra?: Record<string, string>): Record<string, string> {
    const baseUrl = window.location.origin;
    return {
      cliente_nome: client.name,
      cliente_empresa: client.company,
      cliente_telefone: client.phone || '',
      cliente_email: client.email,
      demanda_titulo: demand.title,
      demanda_tipo: demand.content_type,
      demanda_status: demand.status,
      link_aprovacao: `${baseUrl}/aprovacao/${demand.approval_token}`,
      data_agendamento: demand.scheduled_date || '',
      agencia_nome: this.agencyName,
      ...extra
    };
  }

  // Execute automation
  async executeAutomation(
    trigger: AutomationTrigger,
    demand: Demand,
    client: Client,
    extra?: { feedback?: string; teamEmail?: string; teamPhone?: string }
  ): Promise<void> {
    const activeRules = this.rules.filter(r => r.trigger === trigger && r.is_active);

    for (const rule of activeRules) {
      for (const action of rule.actions) {
        try {
          await this.executeAction(action, demand, client, extra);
        } catch (error) {
          console.error(`Automation action failed: ${action.type}`, error);
        }
      }
    }
  }

  private async executeAction(
    action: AutomationAction,
    demand: Demand,
    client: Client,
    extra?: { feedback?: string; teamEmail?: string; teamPhone?: string }
  ): Promise<void> {
    const variables = this.buildVariables(demand, client, { feedback: extra?.feedback || '' });

    switch (action.type) {
      case 'send_whatsapp': {
        const template = action.config.template as NotificationTrigger;
        const phone = action.config.to === 'client' ? client.phone : extra?.teamPhone;
        if (phone) {
          await notificationManager.sendNotification(template, variables, phone);
        }
        break;
      }

      case 'send_email': {
        const template = action.config.template as EmailTemplateKey;
        const email = action.config.to === 'client' ? client.email : extra?.teamEmail;
        const name = action.config.to === 'client' ? client.name : 'Equipe';
        if (email) {
          await emailService.sendEmail(template, variables, email, name);
        }
        break;
      }

      case 'webhook': {
        const url = action.config.url;
        if (url) {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ demand, client, variables })
          });
        }
        break;
      }

      default:
        console.log(`Action type ${action.type} not implemented`);
    }
  }

  // Helper methods for common scenarios
  async onDemandCreated(demand: Demand, client: Client) {
    await this.executeAutomation('demand_created', demand, client);
  }

  async onApprovalRequested(demand: Demand, client: Client) {
    await this.executeAutomation('approval_requested', demand, client);
  }

  async onAdjustmentRequested(demand: Demand, client: Client, feedback: string, teamEmail?: string, teamPhone?: string) {
    await this.executeAutomation('adjustment_requested', demand, client, { feedback, teamEmail, teamPhone });
  }

  async onDemandPublished(demand: Demand, client: Client) {
    await this.executeAutomation('demand_published', demand, client);
  }

  async onPaymentCreated(demand: Demand, client: Client, value: string, paymentLink: string) {
    await this.executeAutomation('payment_created', demand, client);
    // Send payment notification
    if (client.phone) {
      await notificationManager.sendNotification('payment_pending', {
        cliente_nome: client.name,
        valor_cobranca: value,
        link_pagamento: paymentLink,
        agencia_nome: this.agencyName
      }, client.phone);
    }
  }

  async onPaymentReceived(demand: Demand, client: Client, value: string) {
    await this.executeAutomation('payment_received', demand, client);
    if (client.phone) {
      await notificationManager.sendNotification('payment_received', {
        cliente_nome: client.name,
        valor_cobranca: value,
        agencia_nome: this.agencyName
      }, client.phone);
    }
  }
}

export const workflowAutomation = new WorkflowAutomation();
