// Edge Function: AI Image Generation
// Suporta: FAL.ai (Flux, SDXL, Ideogram, Recraft), OpenAI (DALL-E), Google (Imagen 3)
// Runtime: Edge com features de resiliência
// Features: Retry, Circuit Breaker, Validation, Structured Logging

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
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'],
};

// FAL.ai models mapping
const FALAI_MODELS: Record<string, string> = {
  'flux-schnell': 'fal-ai/flux/schnell',
  'flux-dev': 'fal-ai/flux/dev',
  'flux-pro': 'fal-ai/flux-pro/v1.1',
  'flux-realism': 'fal-ai/flux-realism',
  'sdxl': 'fal-ai/fast-sdxl',
  'ideogram': 'fal-ai/ideogram/v2',
  'recraft': 'fal-ai/recraft-v3',
};

interface ImageRequest {
  provider: 'falai' | 'openai' | 'google';
  model: string;
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  size?: string;
  quality?: string;
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  errors.push(...validate.required(body.provider, 'provider'));
  errors.push(...validate.required(body.prompt, 'prompt'));
  errors.push(...validate.enum(body.provider, 'provider', ['falai', 'openai', 'google']));
  errors.push(...validate.string(body.prompt, 'prompt', { minLength: 1, maxLength: 10000 }));

  if (body.numImages !== undefined) {
    errors.push(...validate.number(body.numImages, 'numImages', { min: 1, max: 4 }));
  }

  return { valid: errors.length === 0, errors };
}

export default async function handler(req: Request): Promise<Response> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: ImageRequest = await req.json();
    const { provider, model, prompt, negativePrompt, numImages = 1, size = '1:1' } = body;

    // Validate
    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('image', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`image:${ip}`, 30, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('image', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Aguarde 1 minuto.', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 30));
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen(provider)) {
      structuredLog.warn('image', 'circuit_open', { provider, requestId });
      return errorResponse(`${provider} temporariamente indisponível. Tente novamente em 1 minuto.`, 503);
    }

    // Get API keys from environment
    const apiKeys: Record<string, string> = {
      falai: process.env.FALAI_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      google: process.env.GEMINI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return errorResponse(`${provider} API key não configurada no servidor`, 500);
    }

    let images: string[] = [];

    structuredLog.info('image', 'request_start', { provider, model, promptLength: prompt.length, requestId });

    try {
      // ============ FAL.AI ============
      if (provider === 'falai') {
        const falModel = FALAI_MODELS[model] || FALAI_MODELS['flux-schnell'];

        // Map size to FAL.ai format
        const sizeMap: Record<string, string> = {
          '1:1': 'square',
          '16:9': 'landscape_16_9',
          '9:16': 'portrait_9_16',
          '4:3': 'landscape_4_3',
          '3:4': 'portrait_4_3',
        };

        // Build request based on model
        const requestBody: Record<string, any> = {
          prompt,
          num_images: numImages,
          image_size: sizeMap[size] || 'square',
          enable_safety_checker: true,
        };

        // Model-specific settings
        if (falModel.includes('schnell')) {
          requestBody.num_inference_steps = 4;
        } else if (falModel.includes('dev')) {
          requestBody.num_inference_steps = 28;
          requestBody.guidance_scale = 3.5;
        } else if (falModel.includes('pro')) {
          requestBody.num_inference_steps = 25;
          requestBody.guidance_scale = 3.0;
        } else if (falModel.includes('ideogram')) {
          requestBody.style = 'auto';
          requestBody.magic_prompt_option = 'auto';
        } else if (falModel.includes('recraft')) {
          requestBody.style = 'realistic_image';
        }

        if (negativePrompt) {
          requestBody.negative_prompt = negativePrompt;
        }

        structuredLog.info('image', 'falai_request', { model: falModel, requestId });

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
          { maxRetries: 2, baseDelayMs: 1000 }
        );

        if (!falRes.ok) {
          const error = await falRes.json().catch(() => ({}));
          throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
        }

        const falData = await falRes.json();
        images = falData.images?.map((img: any) => img.url) || [];
      }

      // ============ OPENAI DALL-E ============
      else if (provider === 'openai') {
        const isDalle3 = model === 'dall-e-3';

        const sizeMap: Record<string, string> = {
          '1:1': '1024x1024',
          '16:9': '1792x1024',
          '9:16': '1024x1792',
          '4:3': '1024x1024',
          '3:4': '1024x1024',
        };

        const oaiRes = await fetchWithRetry(
          'https://api.openai.com/v1/images/generations',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: isDalle3 ? 'dall-e-3' : 'dall-e-2',
              prompt,
              n: isDalle3 ? 1 : Math.min(numImages, 4),
              size: isDalle3 ? (sizeMap[size] || '1024x1024') : '1024x1024',
              quality: 'standard',
            }),
          },
          { maxRetries: 2, baseDelayMs: 1000 }
        );

        if (!oaiRes.ok) {
          const error = await oaiRes.json().catch(() => ({}));
          throw new Error(error.error?.message || `OpenAI error ${oaiRes.status}`);
        }

        const oaiData = await oaiRes.json();
        images = oaiData.data?.map((img: any) => img.url) || [];
      }

      // ============ GOOGLE GEMINI 2.0 (Imagen) ============
      else if (provider === 'google') {
        // Usar Gemini 2.0 Flash experimental com geração de imagem
        const geminiRes = await fetchWithRetry(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate an image: ${prompt}`
                }]
              }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE'],
              }
            }),
          },
          { maxRetries: 2, baseDelayMs: 1000 }
        );

        if (!geminiRes.ok) {
          const error = await geminiRes.json().catch(() => ({}));
          const errorMsg = error.error?.message || `Google Gemini error ${geminiRes.status}`;

          // Fallback message for image generation not available
          if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
            throw new Error('Google Imagen não disponível. Use FAL.ai Flux ou OpenAI DALL-E.');
          }
          throw new Error(errorMsg);
        }

        const geminiData = await geminiRes.json();

        // Extract images from response
        if (geminiData.candidates?.[0]?.content?.parts) {
          for (const part of geminiData.candidates[0].content.parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }

        // If no images, throw helpful error
        if (images.length === 0) {
          throw new Error('Google Gemini não gerou imagem. Use FAL.ai Flux (recomendado) ou OpenAI DALL-E.');
        }
      }

      // Record success
      circuitBreaker.recordSuccess(provider);

    } catch (providerError: any) {
      circuitBreaker.recordFailure(provider);
      throw providerError;
    }

    const responseTime = Date.now() - startTime;

    structuredLog.request('image', 'request_complete', startTime, true, {
      provider,
      model,
      imageCount: images.length,
      requestId,
    });

    return successResponse(
      {
        images,
        provider,
        model,
        count: images.length,
        responseTimeMs: responseTime,
      },
      {
        ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 30),
        ...securityHeaders,
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=3600',
      }
    );

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    structuredLog.error('image', 'request_failed', error, {
      requestId,
      duration: responseTime,
    });

    // User-friendly error messages
    let message = error.message || 'Erro interno do servidor';

    if (message.includes('Failed to fetch')) {
      message = 'Erro de conexão. Verifique sua internet.';
    } else if (message.includes('401') || message.includes('Unauthorized')) {
      message = 'API Key inválida.';
    } else if (message.includes('429')) {
      message = 'Limite de requisições excedido. Aguarde alguns minutos.';
    } else if (message.includes('403')) {
      message = 'Sem permissão para este recurso.';
    }

    return errorResponse(message, 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
