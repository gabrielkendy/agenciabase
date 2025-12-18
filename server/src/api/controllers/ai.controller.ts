import { Request, Response } from 'express';
import { AIProviderFactory } from '../../services/ai/index.js';
import { queueService } from '../../services/queue/queue.service.js';
import { creditsService } from '../../services/billing/credits.service.js';
import { pricingService } from '../../services/billing/pricing.service.js';
import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { generateId } from '../../utils/helpers.js';

export const aiController = {
  /**
   * Gerar imagem (síncrono - para jobs rápidos)
   */
  async generateImage(req: Request, res: Response) {
    try {
      const { prompt, negativePrompt, provider = 'falai', model = 'flux-schnell', aspectRatio = '1:1', numImages = 1 } = req.body;
      const { organizationId, userId } = req.user!;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Calcular custo
      const { credits, costUsd } = await pricingService.calculateCost({
        provider,
        model,
        operation: 'generate',
        quantity: numImages,
      });

      // Verificar créditos
      const hasCredits = await creditsService.hasEnoughCredits(organizationId, credits);
      if (!hasCredits) {
        const balance = await creditsService.getBalance(organizationId);
        return res.status(402).json({
          error: 'Insufficient credits',
          required: credits,
          balance,
        });
      }

      // Gerar
      const aiProvider = AIProviderFactory.create(provider, undefined, model);
      const result = await aiProvider.generateImage({
        prompt,
        negativePrompt,
        aspectRatio,
        numImages,
      });

      // Salvar geração no banco
      const generationId = generateId();
      const { error: dbError } = await supabase.from('generations').insert({
        id: generationId,
        organization_id: organizationId,
        user_id: userId,
        type: 'image',
        provider,
        model,
        prompt,
        negative_prompt: negativePrompt,
        input_params: { aspectRatio, numImages },
        output_url: result.images[0],
        output_metadata: result.metadata,
        width: result.width,
        height: result.height,
        credits_used: credits,
        cost_usd: costUsd,
      });

      if (dbError) {
        logger.error('Error saving generation:', dbError);
      }

      // Debitar créditos
      await creditsService.debit({
        organizationId,
        userId,
        amount: credits,
        referenceType: 'generation',
        referenceId: generationId,
        description: `Image: ${model}`,
      });

      res.json({
        success: true,
        data: {
          generationId,
          images: result.images,
          width: result.width,
          height: result.height,
          creditsUsed: credits,
          metadata: result.metadata,
        },
      });
    } catch (error: any) {
      logger.error('Image generation error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Gerar imagem assíncrono (via fila)
   */
  async generateImageAsync(req: Request, res: Response) {
    try {
      const { prompt, negativePrompt, provider = 'falai', model = 'flux-schnell', aspectRatio = '1:1', numImages = 1 } = req.body;
      const { organizationId, userId, plan } = req.user!;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Calcular custo
      const { credits } = await pricingService.calculateCost({
        provider,
        model,
        operation: 'generate',
        quantity: numImages,
      });

      // Verificar créditos
      const hasCredits = await creditsService.hasEnoughCredits(organizationId, credits);
      if (!hasCredits) {
        const balance = await creditsService.getBalance(organizationId);
        return res.status(402).json({
          error: 'Insufficient credits',
          required: credits,
          balance,
        });
      }

      // Prioridade baseada no plano
      const priorityMap: Record<string, number> = {
        free: 0,
        starter: 1,
        professional: 2,
        business: 3,
        enterprise: 4,
      };

      const priority = priorityMap[plan] || 0;

      // Adicionar na fila
      const job = await queueService.addImageJob({
        organizationId,
        userId,
        prompt,
        negativePrompt,
        provider,
        model,
        aspectRatio,
        numImages,
      }, priority);

      // Salvar job no banco
      await supabase.from('ai_jobs').insert({
        id: job.id,
        organization_id: organizationId,
        user_id: userId,
        type: 'image',
        provider,
        model,
        status: 'queued',
        priority,
        input: { prompt, negativePrompt, aspectRatio, numImages },
        queued_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: 'queued',
          estimatedCredits: credits,
        },
      });
    } catch (error: any) {
      logger.error('Async image generation error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Gerar vídeo (sempre assíncrono)
   */
  async generateVideo(req: Request, res: Response) {
    try {
      const { sourceImage, motionPrompt, provider = 'falai', model = 'fast-svd', duration = 5 } = req.body;
      const { organizationId, userId, plan } = req.user!;

      if (!sourceImage) {
        return res.status(400).json({ error: 'Source image is required' });
      }

      // Calcular custo
      const { credits } = await pricingService.calculateCost({
        provider,
        model,
        operation: 'generate',
        durationSeconds: duration,
      });

      // Verificar créditos
      const hasCredits = await creditsService.hasEnoughCredits(organizationId, credits);
      if (!hasCredits) {
        const balance = await creditsService.getBalance(organizationId);
        return res.status(402).json({
          error: 'Insufficient credits',
          required: credits,
          balance,
        });
      }

      // Prioridade baseada no plano
      const priorityMap: Record<string, number> = {
        free: 0,
        starter: 1,
        professional: 2,
        business: 3,
        enterprise: 4,
      };

      const priority = priorityMap[plan] || 0;

      // Adicionar na fila
      const job = await queueService.addVideoJob({
        organizationId,
        userId,
        sourceImage,
        motionPrompt,
        provider,
        model,
        duration,
      }, priority);

      // Salvar job no banco
      await supabase.from('ai_jobs').insert({
        id: job.id,
        organization_id: organizationId,
        user_id: userId,
        type: 'video',
        provider,
        model,
        status: 'queued',
        priority,
        input: { sourceImage: '(base64)', motionPrompt, duration },
        queued_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          jobId: job.id,
          status: 'queued',
          estimatedCredits: credits,
        },
      });
    } catch (error: any) {
      logger.error('Video generation error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter status de um job
   */
  async getJobStatus(req: Request, res: Response) {
    try {
      const { jobId } = req.params;
      const { queueName = 'image-generation' } = req.query;

      const status = await queueService.getJobStatus(queueName as string, jobId);

      if (!status) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter uma geração específica
   */
  async getGeneration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Listar gerações do usuário
   */
  async listGenerations(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { type, limit = 50, offset = 0 } = req.query;

      let query = supabase
        .from('generations')
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar geração
   */
  async deleteGeneration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('generations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default aiController;
