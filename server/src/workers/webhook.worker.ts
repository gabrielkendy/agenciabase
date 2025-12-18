import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  retryCount?: number;
}

let worker: Worker | null = null;
let isRunning = false;

const MAX_RETRIES = 3;

async function processWebhookJob(job: Job<WebhookJobData>): Promise<void> {
  const { webhookId, event, payload, retryCount = 0 } = job.data;

  logger.info(`Processing webhook ${webhookId}`, { event, retryCount });

  try {
    // Get webhook config
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .select('id, url, secret, is_active')
      .eq('id', webhookId)
      .single();

    if (webhookError || !webhook) {
      logger.warn(`Webhook ${webhookId} not found`);
      return;
    }

    if (!webhook.is_active) {
      logger.info(`Webhook ${webhookId} is disabled, skipping`);
      return;
    }

    // Prepare payload with metadata
    const fullPayload = {
      event,
      timestamp: new Date().toISOString(),
      webhookId,
      data: payload,
    };

    // Sign payload
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(JSON.stringify(fullPayload))
      .digest('hex');

    // Send webhook
    const startTime = Date.now();
    let statusCode = 0;
    let responseBody = '';
    let error = '';

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': job.id || '',
          'User-Agent': 'BaseAgency-Webhook/1.0',
        },
        body: JSON.stringify(fullPayload),
        signal: AbortSignal.timeout(30000),
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
    } catch (err: any) {
      error = err.message;
      logger.error(`Webhook delivery failed:`, err);
    }

    const durationMs = Date.now() - startTime;
    const delivered = statusCode >= 200 && statusCode < 300;

    // Save delivery record
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event,
      payload: fullPayload,
      status_code: statusCode,
      response_body: responseBody.slice(0, 1000),
      duration_ms: durationMs,
      delivered,
      error: error || null,
    });

    // If failed and retries available, throw to trigger retry
    if (!delivered && retryCount < MAX_RETRIES) {
      throw new Error(`Webhook delivery failed, will retry...`);
    }

    if (!delivered) {
      logger.error(`Webhook ${webhookId} failed after ${MAX_RETRIES} retries`);
    } else {
      logger.info(`Webhook ${webhookId} delivered successfully`, {
        statusCode,
        durationMs,
      });
    }
  } catch (error: any) {
    logger.error(`Webhook job error:`, error);
    throw error;
  }
}

/**
 * Queue a webhook delivery
 */
export async function queueWebhook(
  organizationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Get all active webhooks for this org that subscribe to this event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [event]);

    if (error || !webhooks || webhooks.length === 0) {
      return;
    }

    // Import queue service here to avoid circular dependency
    const { queueService } = await import('../services/queue/queue.service.js');

    // Queue webhook for each matching webhook
    for (const webhook of webhooks) {
      await queueService.addWebhookJob({
        webhookId: webhook.id,
        event,
        payload,
        retryCount: 0,
      });
    }

    logger.info(`Queued ${webhooks.length} webhook(s) for event ${event}`);
  } catch (error) {
    logger.error('Failed to queue webhooks:', error);
  }
}

export const webhookWorker = {
  async start(): Promise<void> {
    if (isRunning) {
      logger.warn('Webhook worker is already running');
      return;
    }

    const connection = getRedisConnection();

    worker = new Worker('webhook', processWebhookJob, {
      connection,
      concurrency: 10,
      limiter: {
        max: 20,
        duration: 1000,
      },
    });

    worker.on('completed', (job) => {
      logger.debug(`Webhook job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      if (!error.message.includes('will retry')) {
        logger.error(`Webhook job ${job?.id} failed:`, error);
      }
    });

    worker.on('error', (error) => {
      logger.error('Webhook worker error:', error);
    });

    isRunning = true;
    logger.info('Webhook worker started');
  },

  async stop(): Promise<void> {
    if (worker) {
      await worker.close();
      worker = null;
      isRunning = false;
      logger.info('Webhook worker stopped');
    }
  },

  isRunning(): boolean {
    return isRunning;
  },
};

export default webhookWorker;
