import { logger } from '../utils/logger.js';
import { imageWorker } from './image.worker.js';
import { videoWorker } from './video.worker.js';
import { audioWorker } from './audio.worker.js';
import { webhookWorker } from './webhook.worker.js';

/**
 * Start all workers
 */
export async function startWorkers(): Promise<void> {
  logger.info('Starting workers...');

  try {
    // Start all workers
    await Promise.all([
      imageWorker.start(),
      videoWorker.start(),
      audioWorker.start(),
      webhookWorker.start(),
    ]);

    logger.info('All workers started successfully');
  } catch (error) {
    logger.error('Failed to start workers:', error);
    throw error;
  }
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers(): Promise<void> {
  logger.info('Stopping workers...');

  try {
    await Promise.all([
      imageWorker.stop(),
      videoWorker.stop(),
      audioWorker.stop(),
      webhookWorker.stop(),
    ]);

    logger.info('All workers stopped');
  } catch (error) {
    logger.error('Error stopping workers:', error);
  }
}

/**
 * Get workers status
 */
export function getWorkersStatus(): Record<string, boolean> {
  return {
    image: imageWorker.isRunning(),
    video: videoWorker.isRunning(),
    audio: audioWorker.isRunning(),
    webhook: webhookWorker.isRunning(),
  };
}

export { imageWorker, videoWorker, audioWorker, webhookWorker };
