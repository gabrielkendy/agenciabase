import { Queue, Job } from 'bullmq';
import { getRedisConnection } from '../../config/redis.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

let imageQueue: Queue | null = null;
let videoQueue: Queue | null = null;
let audioQueue: Queue | null = null;
let webhookQueue: Queue | null = null;

export async function initializeQueue(): Promise<void> {
  try {
    const connection = getRedisConnection();

    imageQueue = new Queue('image-generation', {
      connection,
      defaultJobOptions: config.queue.defaultJobOptions,
    });

    videoQueue = new Queue('video-generation', {
      connection,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        attempts: 2,
      },
    });

    audioQueue = new Queue('audio-generation', {
      connection,
      defaultJobOptions: config.queue.defaultJobOptions,
    });

    webhookQueue = new Queue('webhook', {
      connection,
      defaultJobOptions: {
        ...config.queue.defaultJobOptions,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    logger.info('Queues initialized');
  } catch (error) {
    logger.error('Failed to initialize queues:', error);
    throw error;
  }
}

export function getImageQueue(): Queue {
  if (!imageQueue) {
    throw new Error('Image queue not initialized');
  }
  return imageQueue;
}

export function getVideoQueue(): Queue {
  if (!videoQueue) {
    throw new Error('Video queue not initialized');
  }
  return videoQueue;
}

export function getAudioQueue(): Queue {
  if (!audioQueue) {
    throw new Error('Audio queue not initialized');
  }
  return audioQueue;
}

export function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    throw new Error('Webhook queue not initialized');
  }
  return webhookQueue;
}

export interface ImageJobData {
  organizationId: string;
  userId: string;
  prompt: string;
  negativePrompt?: string;
  provider: string;
  model: string;
  style?: string;
  aspectRatio?: string;
  numImages?: number;
  apiKey?: string;
}

export interface VideoJobData {
  organizationId: string;
  userId: string;
  sourceImage: string;
  motionPrompt?: string;
  provider: string;
  model: string;
  duration?: number;
  apiKey?: string;
}

export interface WebhookJobData {
  webhookId: string;
  url: string;
  secret: string;
  payload: Record<string, unknown>;
  attempt?: number;
  retryCount?: number;
}

export const queueService = {
  /**
   * Adicionar job de imagem na fila
   */
  async addImageJob(data: ImageJobData, priority?: number): Promise<Job> {
    const queue = getImageQueue();
    const job = await queue.add('generate', data, {
      priority: priority || 0,
    });

    logger.info(`Image job ${job.id} added to queue`);
    return job;
  },

  /**
   * Adicionar job de vídeo na fila
   */
  async addVideoJob(data: VideoJobData, priority?: number): Promise<Job> {
    const queue = getVideoQueue();
    const job = await queue.add('generate', data, {
      priority: priority || 0,
    });

    logger.info(`Video job ${job.id} added to queue`);
    return job;
  },

  /**
   * Adicionar job de webhook na fila
   */
  async addWebhookJob(data: WebhookJobData): Promise<Job> {
    const queue = getWebhookQueue();
    const job = await queue.add('deliver', data);

    logger.info(`Webhook job ${job.id} added to queue`);
    return job;
  },

  /**
   * Obter status de um job
   */
  async getJobStatus(queueName: string, jobId: string): Promise<{
    status: string;
    progress: number;
    result?: unknown;
    error?: string;
  } | null> {
    let queue: Queue;

    switch (queueName) {
      case 'image-generation':
        queue = getImageQueue();
        break;
      case 'video-generation':
        queue = getVideoQueue();
        break;
      case 'audio-generation':
        queue = getAudioQueue();
        break;
      case 'webhook':
        queue = getWebhookQueue();
        break;
      default:
        return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = typeof job.progress === 'number' ? job.progress : 0;

    return {
      status: state,
      progress,
      result: job.returnvalue,
      error: job.failedReason,
    };
  },

  /**
   * Cancelar um job
   */
  async cancelJob(queueName: string, jobId: string): Promise<boolean> {
    let queue: Queue;

    switch (queueName) {
      case 'image-generation':
        queue = getImageQueue();
        break;
      case 'video-generation':
        queue = getVideoQueue();
        break;
      case 'audio-generation':
        queue = getAudioQueue();
        break;
      case 'webhook':
        queue = getWebhookQueue();
        break;
      default:
        return false;
    }

    const job = await queue.getJob(jobId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      return true;
    }

    return false;
  },

  /**
   * Obter estatísticas das filas
   */
  async getQueueStats() {
    const stats = {
      image: await getQueueCounts(getImageQueue()),
      video: await getQueueCounts(getVideoQueue()),
      audio: await getQueueCounts(getAudioQueue()),
      webhook: await getQueueCounts(getWebhookQueue()),
    };

    return stats;
  },
};

async function getQueueCounts(queue: Queue) {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

export default queueService;
