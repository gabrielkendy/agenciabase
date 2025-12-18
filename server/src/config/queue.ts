import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnection } from './redis.js';
import { config } from './index.js';

let imageQueue: Queue | null = null;
let videoQueue: Queue | null = null;
let audioQueue: Queue | null = null;

const defaultQueueOptions: Partial<QueueOptions> = {
  defaultJobOptions: config.queue.defaultJobOptions,
};

export function getImageQueue(): Queue {
  if (!imageQueue) {
    throw new Error('Image queue not initialized. Call initializeQueues() first.');
  }
  return imageQueue;
}

export function getVideoQueue(): Queue {
  if (!videoQueue) {
    throw new Error('Video queue not initialized. Call initializeQueues() first.');
  }
  return videoQueue;
}

export function getAudioQueue(): Queue {
  if (!audioQueue) {
    throw new Error('Audio queue not initialized. Call initializeQueues() first.');
  }
  return audioQueue;
}

export async function initializeQueues(): Promise<void> {
  const connection = getRedisConnection();

  imageQueue = new Queue('image-generation', {
    connection,
    ...defaultQueueOptions,
  });

  videoQueue = new Queue('video-generation', {
    connection,
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...config.queue.defaultJobOptions,
      attempts: 2, // Videos são mais caros, menos retries
    },
  });

  audioQueue = new Queue('audio-generation', {
    connection,
    ...defaultQueueOptions,
  });

  console.log('Queues initialized');
}

export async function closeQueues(): Promise<void> {
  if (imageQueue) await imageQueue.close();
  if (videoQueue) await videoQueue.close();
  if (audioQueue) await audioQueue.close();

  imageQueue = null;
  videoQueue = null;
  audioQueue = null;
}

// Helper para adicionar jobs com prioridade
export async function addImageJob(
  data: Record<string, unknown>,
  options?: { priority?: number }
) {
  const queue = getImageQueue();
  return queue.add('generate', data, {
    priority: options?.priority || 0,
  });
}

export async function addVideoJob(
  data: Record<string, unknown>,
  options?: { priority?: number }
) {
  const queue = getVideoQueue();
  return queue.add('generate', data, {
    priority: options?.priority || 0,
  });
}

export async function addAudioJob(
  data: Record<string, unknown>,
  options?: { priority?: number }
) {
  const queue = getAudioQueue();
  return queue.add('generate', data, {
    priority: options?.priority || 0,
  });
}
