import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { AIProviderFactory } from '../services/ai/index.js';
import { creditsService } from '../services/billing/credits.service.js';
import { pricingService } from '../services/billing/pricing.service.js';

interface ImageJobData {
  jobId: string;
  organizationId: string;
  userId: string;
  prompt: string;
  provider: string;
  model: string;
  aspectRatio?: string;
  numImages?: number;
  negativePrompt?: string;
  estimatedCredits: number;
}

let worker: Worker | null = null;
let isRunning = false;

async function processImageJob(job: Job<ImageJobData>): Promise<void> {
  const {
    jobId,
    organizationId,
    userId,
    prompt,
    provider,
    model,
    aspectRatio = '1:1',
    numImages = 1,
    negativePrompt,
  } = job.data;

  logger.info(`Processing image job ${jobId}`, { provider, model });

  try {
    // Update job status to processing
    await supabase
      .from('ai_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Create AI provider
    const aiProvider = AIProviderFactory.create(provider as any, undefined, model);

    // Generate image
    const startTime = Date.now();
    const result = await aiProvider.generateImage({
      prompt,
      aspectRatio: aspectRatio as any,
      numImages,
      negativePrompt,
    });
    const processingTime = Date.now() - startTime;

    // Calculate actual credits
    const { credits: actualCredits } = await pricingService.calculateCost({
      provider,
      model,
      operation: 'generate',
      quantity: numImages,
    });

    // Debit credits
    await creditsService.debit({
      organizationId,
      userId,
      amount: actualCredits,
      referenceType: 'generation',
      referenceId: jobId,
      description: `Image generation: ${model}`,
    });

    // Save generations
    const generations = result.images.map((url: string, index: number) => ({
      organization_id: organizationId,
      user_id: userId,
      job_id: jobId,
      type: 'image',
      provider,
      model,
      prompt,
      output_url: url,
      metadata: {
        aspectRatio,
        negativePrompt,
        index,
        processingTime,
      },
      credits_used: Math.round(actualCredits / result.images.length),
    }));

    await supabase.from('generations').insert(generations);

    // Update job to completed
    await supabase
      .from('ai_jobs')
      .update({
        status: 'completed',
        result: { images: result.images },
        credits_used: actualCredits,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.info(`Image job ${jobId} completed`, {
      images: result.images.length,
      credits: actualCredits,
      processingTime,
    });
  } catch (error: any) {
    logger.error(`Image job ${jobId} failed:`, error);

    // Update job to failed
    await supabase
      .from('ai_jobs')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    throw error;
  }
}

export const imageWorker = {
  async start(): Promise<void> {
    if (isRunning) {
      logger.warn('Image worker is already running');
      return;
    }

    const connection = getRedisConnection();

    worker = new Worker('image-generation', processImageJob, {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    });

    worker.on('completed', (job) => {
      logger.info(`Image job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Image job ${job?.id} failed:`, error);
    });

    worker.on('error', (error) => {
      logger.error('Image worker error:', error);
    });

    isRunning = true;
    logger.info('Image worker started');
  },

  async stop(): Promise<void> {
    if (worker) {
      await worker.close();
      worker = null;
      isRunning = false;
      logger.info('Image worker stopped');
    }
  },

  isRunning(): boolean {
    return isRunning;
  },
};

export default imageWorker;
