import { Worker, Job } from 'bullmq';
import { getRedisConnection } from '../config/redis.js';
import { supabase } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { creditsService } from '../services/billing/credits.service.js';
import { pricingService } from '../services/billing/pricing.service.js';
import { config } from '../config/index.js';

interface AudioJobData {
  jobId: string;
  organizationId: string;
  userId: string;
  text: string;
  voice: string;
  provider: string;
  model: string;
  estimatedCredits: number;
}

let worker: Worker | null = null;
let isRunning = false;

async function processAudioJob(job: Job<AudioJobData>): Promise<void> {
  const {
    jobId,
    organizationId,
    userId,
    text,
    voice,
    provider,
    model,
  } = job.data;

  logger.info(`Processing audio job ${jobId}`, { provider, model, voice });

  try {
    // Update job status to processing
    await supabase
      .from('ai_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Get API key
    const apiKey = config.providers.elevenlabs?.apiKey || '';

    // Generate audio using ElevenLabs
    const startTime = Date.now();
    const audioBuffer = await generateWithElevenLabs(text, voice, apiKey);
    const processingTime = Date.now() - startTime;

    // Upload to storage
    const fileName = `audio/${organizationId}/${jobId}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    const audioUrl = urlData.publicUrl;

    // Calculate actual credits based on characters
    const characters = text.length;
    const { credits: actualCredits } = await pricingService.calculateCost({
      provider,
      model,
      operation: 'generate',
      characters,
    });

    // Debit credits
    await creditsService.debit({
      organizationId,
      userId,
      amount: actualCredits,
      referenceType: 'generation',
      referenceId: jobId,
      description: `Audio generation: ${model}`,
    });

    // Save generation
    await supabase.from('generations').insert({
      organization_id: organizationId,
      user_id: userId,
      job_id: jobId,
      type: 'audio',
      provider,
      model,
      prompt: text.substring(0, 500),
      output_url: audioUrl,
      metadata: {
        voice,
        characters,
        duration: Math.ceil(characters / 15),
        processingTime,
      },
      credits_used: actualCredits,
    });

    // Update job to completed
    await supabase
      .from('ai_jobs')
      .update({
        status: 'completed',
        result: { audioUrl, characters, voice },
        credits_used: actualCredits,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    logger.info(`Audio job ${jobId} completed`, {
      audioUrl,
      credits: actualCredits,
      processingTime,
    });
  } catch (error: any) {
    logger.error(`Audio job ${jobId} failed:`, error);

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

async function generateWithElevenLabs(
  text: string,
  voiceId: string,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error((error as any).detail?.message || 'ElevenLabs API error');
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export const audioWorker = {
  async start(): Promise<void> {
    if (isRunning) {
      logger.warn('Audio worker is already running');
      return;
    }

    const connection = getRedisConnection();

    worker = new Worker('audio-generation', processAudioJob, {
      connection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    });

    worker.on('completed', (job) => {
      logger.info(`Audio job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Audio job ${job?.id} failed:`, error);
    });

    worker.on('error', (error) => {
      logger.error('Audio worker error:', error);
    });

    isRunning = true;
    logger.info('Audio worker started');
  },

  async stop(): Promise<void> {
    if (worker) {
      await worker.close();
      worker = null;
      isRunning = false;
      logger.info('Audio worker stopped');
    }
  },

  isRunning(): boolean {
    return isRunning;
  },
};

export default audioWorker;
