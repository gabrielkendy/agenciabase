import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { queueService } from '../queue/queue.service.js';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: string;
  webhookId?: string;
}

interface Webhook {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  secret?: string;
  enabled: boolean;
  createdAt: string;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

export const webhookService = {
  /**
   * Register a new webhook
   */
  async register(
    organizationId: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<Webhook> {
    const generatedSecret = secret || crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: organizationId,
        url,
        events,
        secret: generatedSecret,
        enabled: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to register webhook: ${error.message}`);
    }

    logger.info('Webhook registered', { webhookId: data.id, url, events });

    return this.formatWebhook(data);
  },

  /**
   * Update a webhook
   */
  async update(
    webhookId: string,
    updates: Partial<{ url: string; events: string[]; enabled: boolean }>
  ): Promise<Webhook> {
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update webhook: ${error.message}`);
    }

    logger.info('Webhook updated', { webhookId, updates });

    return this.formatWebhook(data);
  },

  /**
   * Delete a webhook
   */
  async delete(webhookId: string): Promise<boolean> {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      throw new Error(`Failed to delete webhook: ${error.message}`);
    }

    logger.info('Webhook deleted', { webhookId });
    return true;
  },

  /**
   * Get webhook by ID
   */
  async getById(webhookId: string): Promise<Webhook | null> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.formatWebhook(data);
  },

  /**
   * List webhooks for an organization
   */
  async listByOrganization(organizationId: string): Promise<Webhook[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list webhooks: ${error.message}`);
    }

    return (data || []).map(this.formatWebhook);
  },

  /**
   * Trigger webhooks for an event
   */
  async trigger(
    organizationId: string,
    event: string,
    data: any
  ): Promise<void> {
    // Get all enabled webhooks for this organization and event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('enabled', true)
      .contains('events', [event]);

    if (error) {
      logger.error('Failed to fetch webhooks:', error);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Queue delivery for each webhook
    for (const webhook of webhooks) {
      await queueService.addWebhookJob({
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        payload: { ...payload, webhookId: webhook.id },
        attempt: 1,
      });
    }

    logger.info('Webhooks triggered', { event, count: webhooks.length });
  },

  /**
   * Deliver a webhook (called by worker)
   */
  async deliver(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload
  ): Promise<DeliveryResult> {
    const startTime = Date.now();

    try {
      const body = JSON.stringify(payload);
      const signature = this.generateSignature(body, secret);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Timestamp': payload.timestamp,
        },
        body,
      });

      const responseTime = Date.now() - startTime;

      // Log delivery
      await this.logDelivery(webhookId, {
        success: response.ok,
        statusCode: response.status,
        responseTime,
        payload,
      });

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          responseTime,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        statusCode: response.status,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      await this.logDelivery(webhookId, {
        success: false,
        responseTime,
        payload,
        error: error.message,
      });

      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  },

  /**
   * Generate HMAC signature for payload
   */
  generateSignature(payload: string, secret: string): string {
    return `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')}`;
  },

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  },

  /**
   * Log webhook delivery attempt
   */
  async logDelivery(
    webhookId: string,
    result: {
      success: boolean;
      statusCode?: number;
      responseTime: number;
      payload: WebhookPayload;
      error?: string;
    }
  ): Promise<void> {
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event: result.payload.event,
      payload: result.payload,
      status: result.success ? 'delivered' : 'failed',
      status_code: result.statusCode,
      response_time_ms: result.responseTime,
      error: result.error,
    });
  },

  /**
   * Get delivery history for a webhook
   */
  async getDeliveryHistory(
    webhookId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    event: string;
    status: string;
    statusCode?: number;
    responseTime: number;
    error?: string;
    createdAt: string;
  }>> {
    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get delivery history: ${error.message}`);
    }

    return (data || []).map(d => ({
      id: d.id,
      event: d.event,
      status: d.status,
      statusCode: d.status_code,
      responseTime: d.response_time_ms,
      error: d.error,
      createdAt: d.created_at,
    }));
  },

  /**
   * Test webhook by sending a test event
   */
  async test(webhookId: string): Promise<DeliveryResult> {
    const webhook = await this.getById(webhookId);

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testPayload: WebhookPayload = {
      event: 'test',
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
      },
      timestamp: new Date().toISOString(),
      webhookId: webhook.id,
    };

    return this.deliver(
      webhook.id,
      webhook.url,
      webhook.secret || '',
      testPayload
    );
  },

  formatWebhook(data: any): Webhook {
    return {
      id: data.id,
      organizationId: data.organization_id,
      url: data.url,
      events: data.events || [],
      secret: data.secret,
      enabled: data.enabled,
      createdAt: data.created_at,
    };
  },
};

export default webhookService;
