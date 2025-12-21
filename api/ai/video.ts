// Edge Function: AI Video Generation
// Suporta: FAL.ai (Kling, MiniMax, Luma, SVD)
// Runtime: Serverless (requer polling longo para alguns modelos)
// Features: Retry, Circuit Breaker, Validation, Structured Logging
// FALLBACK: Aceita API key via header X-API-Key ou body.apiKey

import {
  fetchWithRetry,
  circuitBreaker,
  validate,
  structuredLog,
  edgeRateLimit,
  errorResponse,
  successResponse,
  handleCors,
  generateRequestId,
  securityHeaders,
} from '../lib/edgeUtils';

export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 5 minutos max
};

// FAL.ai video models mapping
const FALAI_VIDEO_MODELS: Record<string, string> = {
  'kling-pro': 'fal-ai/kling-video/v1.6/pro/image-to-video',
  'kling-standard': 'fal-ai/kling-video/v1.6/standard/image-to-video',
  'minimax': 'fal-ai/minimax/video-01/image-to-video',
  'luma-ray2': 'fal-ai/luma-dream-machine/ray-2',
  'fast-svd': 'fal-ai/fast-svd-lcm',
  'stable-video': 'fal-ai/stable-video',
};

interface VideoRequest {
  provider: 'falai';
  model: string;
  image: string;
  prompt?: string;
  duration?: string;
  apiKey?: string; // Fallback API key
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  errors.push(...validate.required(body.provider, 'provider'));
  errors.push(...validate.required(body.image, 'image'));
  errors.push(...validate.enum(body.provider, 'provider', ['falai']));
  if (body.image && !body.image.startsWith('data:') && !body.image.startsWith('http')) {
    errors.push(...validate.base64(body.image, 'image'));
  }
  return { valid: errors.length === 0, errors };
}

// Get API key with fallback chain
function getApiKey(req: Request, body: VideoRequest): string {
  // 1. Env var (production)
  if (process.env.FALAI_API_KEY) {
    console.log('[API Key] Usando env var FALAI_API_KEY');
    return process.env.FALAI_API_KEY;
  }
  // 2. Header
  const headerKey = req.headers.get('X-API-Key');
  if (headerKey) {
    console.log('[API Key] Usando header X-API-Key');
    return headerKey;
  }
  // 3. Body
  if (body.apiKey) {
    console.log('[API Key] Usando body.apiKey');
    return body.apiKey;
  }
  return '';
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: VideoRequest = await req.json();
    const { provider, model, image, prompt = 'Smooth natural motion, cinematic', duration = '5' } = body;

    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('video', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`video:${ip}`, 10, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('video', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Videos: 10/min', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 10));
    }

    if (circuitBreaker.isOpen(provider)) {
      structuredLog.warn('video', 'circuit_open', { provider, requestId });
      return errorResponse(`${provider} temporariamente indisponível. Tente novamente em 1 minuto.`, 503);
    }

    const apiKey = getApiKey(req, body);
    if (!apiKey) {
      return errorResponse('FAL.ai API key não configurada. Configure nas variáveis de ambiente do Vercel ou nas configurações.', 500);
    }

    let videoUrl = '';

    structuredLog.info('video', 'request_start', { provider, model, requestId });

    try {
      const falModel = FALAI_VIDEO_MODELS[model] || FALAI_VIDEO_MODELS['fast-svd'];
      let requestBody: Record<string, any>;

      if (falModel.includes('kling')) {
        requestBody = { image_url: image, prompt, duration, aspect_ratio: '16:9' };
      } else if (falModel.includes('minimax') || falModel.includes('luma')) {
        requestBody = { image_url: image, prompt };
      } else {
        requestBody = { image_url: image, motion_bucket_id: 127, fps: 7, cond_aug: 0.02 };
      }

      structuredLog.info('video', 'falai_request', { model: falModel, requestId });

      const falRes = await fetchWithRetry(
        `https://fal.run/${falModel}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 30000 }
      );

      if (!falRes.ok) {
        const error = await falRes.json().catch(() => ({}));
        throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
      }

      const falData = await falRes.json();
      videoUrl = falData.video?.url || falData.video_url || falData.output?.video || '';

      circuitBreaker.recordSuccess(provider);

    } catch (providerError: any) {
      circuitBreaker.recordFailure(provider);
      throw providerError;
    }

    if (!videoUrl) {
      throw new Error('URL do vídeo não retornada');
    }

    const responseTime = Date.now() - startTime;

    structuredLog.request('video', 'request_complete', startTime, true, { provider, model, requestId });

    return successResponse(
      { videoUrl, provider, model, responseTimeMs: responseTime },
      {
        ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 10),
        ...securityHeaders,
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=86400',
      }
    );

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    structuredLog.error('video', 'request_failed', error, { requestId, duration: responseTime });

    let message = error.message || 'Erro interno do servidor';
    if (message.includes('Failed to fetch')) message = 'Erro de conexão. Verifique sua internet.';
    else if (message.includes('401') || message.includes('Unauthorized')) message = 'API Key inválida.';
    else if (message.includes('429')) message = 'Limite de requisições excedido. Aguarde alguns minutos.';

    return errorResponse(message, 500, { ...securityHeaders, 'X-Request-ID': requestId });
  }
}
