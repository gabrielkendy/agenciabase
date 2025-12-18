import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { AIProviderFactory } from '../services/ai/index.js';
import { creditsService } from '../services/billing/credits.service.js';
import { pricingService } from '../services/billing/pricing.service.js';

interface VideoJobData {
  jobId: string;
  organizationId: string;
  userId: string;
  sourceImage: string;
  motionPrompt?: string;
  provider: string;
  model: string;
  duration?: number;
  estimatedCredits: number;
}

let worker: Worker | null = null;
let isRunning = false;

async function processVideoJob(job: Job<VideoJobData>): Promise<void> {
  const {
    jobId,
    organizationId,
    userId,
    sourceImage,
    motionPrompt,
    provider,
    model,
    duration = 5,
  } = job.data;

  logger.info(`Processing video job ${jobId}`, { provider, model });

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

    // Generate video
    const startTime = Date.now();
    let result: { videoUrl: string };

    if (aiProvider.generateVideo) {
      result = await aiProvider.generateVideo({
        imageUrl: sourceImage,
        motionPrompt,
        duration,
      });
    } else {
      throw new Error(`Provider ${provider} does not support video generation`);
    }

    const processingTime = Date.now() - startTime;

    // Calculate actual credits
    const { credits: actualCredits } = await pricingService.calculateCost({
      provider,
      model,
      operation: 'generate',
      durationSeconds: duration,
    });

    // Debit credits
    await creditsService.debit({
      organizationId,
      userId,
      amount: actualCredits,
      referenceType: 'generation',
      referenceId: jobId,
      description: `Video generation: ${model}`,
    });

    // Save generation
    await supabase.from('generations').insert({
      organization_id: organizationId,
      user_id: userId,
      job_id: jobId,
      type: 'video',
      provider,
      model,
      prompt: motionPrompt || 'Video from image',
      output_url: result.videoUrl,
      metadata: {
        duration,
        sourceImage: '(base64)',
        processingTime,
      },
      credits_used: actualCredits,
    });

    // Update job to completed
    await supabase
      .from('ai_jobs')
      .update({
        status: 'completed',
        result: { videoUrl: result.videoUrl },
        credits_used: actualCredits,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.info(`Video job ${jobId} completed`, {
      videoUrl: result.videoUrl,
      credits: actualCredits,
      processingTime,
    });
  } catch (error: any) {
    logger.error(`Video job ${jobId} failed:`, error);

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

export const videoWorker = {
  async start(): Promise<void> {
    if (isRunning) {
      logger.warn('Video worker is already running');
      return;
    }

    const connection = getRedisConnection();

    worker = new Worker('video-generation', processVideoJob, {
      connection,
      concurrency: 3,
      limiter: {
        max: 5,
        duration: 1000,
      },
    });

    worker.on('completed', (job) => {
      logger.info(`Video job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Video job ${job?.id} failed:`, error);
    });

    worker.on('error', (error) => {
      logger.error('Video worker error:', error);
    });

    isRunning = true;
    logger.info('Video worker started');
  },

  async stop(): Promise<void> {
    if (worker) {
      await worker.close();
      worker = null;
      isRunning = false;
      logger.info('Video worker stopped');
    }
  },

  isRunning(): boolean {
    return isRunning;
  },
};

export default videoWorker;
