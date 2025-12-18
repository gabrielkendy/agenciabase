// Edge Function: AI Image Generation
// Suporta: Freepik (Mystic, Seedream, Flux, Gemini), FAL.ai, OpenAI DALL-E
// Runtime: Edge com fallback para Serverless (para polling)
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

// Freepik endpoints confirmados
const FREEPIK_ENDPOINTS: Record<string, string> = {
  'mystic': '/ai/mystic',
  'gemini-flash': '/ai/gemini-2-5-flash-image-preview',
  'seedream-v4-edit': '/ai/text-to-image/seedream-v4-edit',
  'seedream-v4': '/ai/text-to-image/seedream-v4',
  'seedream': '/ai/text-to-image/seedream',
  'flux-pro-v1-1': '/ai/text-to-image/flux-pro-v1-1',
  'flux-dev': '/ai/text-to-image/flux-dev',
  'hyperflux': '/ai/text-to-image/hyperflux',
  'classic': '/ai/text-to-image',
};

interface ImageRequest {
  provider: 'freepik' | 'falai' | 'openai';
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
  errors.push(...validate.enum(body.provider, 'provider', ['freepik', 'falai', 'openai']));
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
    const { provider, model, prompt, negativePrompt, numImages = 1, size = '1:1', quality = '2k' } = body;

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
      return errorResponse('Rate limit exceeded', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 30));
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen(provider)) {
      structuredLog.warn('image', 'circuit_open', { provider, requestId });
      return errorResponse(`${provider} temporarily unavailable. Try again later.`, 503);
    }

    const apiKeys: Record<string, string> = {
      freepik: process.env.FREEPIK_API_KEY || '',
      falai: process.env.FALAI_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return errorResponse(`${provider} API key not configured`, 500);
    }

    let images: string[] = [];

    structuredLog.info('image', 'request_start', { provider, model, promptLength: prompt.length, requestId });

    try {
      switch (provider) {
        case 'freepik': {
          const endpoint = FREEPIK_ENDPOINTS[model] || '/ai/mystic';
          const isMystic = endpoint === '/ai/mystic';

          // Map size
          const sizeMap: Record<string, string> = {
            '1:1': 'square_1_1',
            '16:9': 'widescreen_16_9',
            '9:16': 'portrait_9_16',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_3_4',
          };

          const requestBody: any = {
            prompt,
            num_images: numImages,
            image: { size: sizeMap[size] || 'square_1_1' },
          };

          if (negativePrompt) requestBody.negative_prompt = negativePrompt;
          if (isMystic && quality !== '1k') requestBody.resolution = quality;

          const fpRes = await fetchWithRetry(
            `https://api.freepik.com/v1${endpoint}`,
            {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
              },
              body: JSON.stringify(requestBody),
            },
            { maxRetries: 2, baseDelayMs: 1000 }
          );

          if (!fpRes.ok) {
            const error = await fpRes.json().catch(() => ({}));
            throw new Error(error.message || error.detail || `Freepik error ${fpRes.status}`);
          }

          const fpData = await fpRes.json();

          // Handle async generation
          if (fpData.data?.id && fpData.data?.status !== 'COMPLETED') {
            let attempts = 0;
            const maxAttempts = 30;

            while (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000));

              const statusRes = await fetch(`https://api.freepik.com/v1${endpoint}/${fpData.data.id}`, {
                headers: {
                  'Accept': 'application/json',
                  'x-freepik-api-key': apiKey,
                },
              });

              const statusData = await statusRes.json();

              if (statusData.data?.status === 'COMPLETED') {
                images = statusData.data.generated?.map((g: any) => g.url) || [];
                break;
              }

              if (statusData.data?.status === 'FAILED') {
                throw new Error('Image generation failed');
              }

              attempts++;
            }

            if (attempts >= maxAttempts) {
              throw new Error('Generation timeout');
            }
          } else if (fpData.data?.generated) {
            images = fpData.data.generated.map((g: any) => g.url);
          } else if (fpData.data?.[0]?.base64) {
            images = fpData.data.map((img: any) => `data:image/png;base64,${img.base64}`);
          }
          break;
        }

        case 'falai': {
          const falSizeMap: Record<string, string> = {
            '1:1': 'square',
            '16:9': 'landscape_16_9',
            '9:16': 'portrait_9_16',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_4_3',
          };

          const falRes = await fetchWithRetry(
            'https://fal.run/fal-ai/flux/schnell',
            {
              method: 'POST',
              headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                prompt,
                num_images: numImages,
                image_size: falSizeMap[size] || 'square',
                num_inference_steps: 4,
                enable_safety_checker: true,
              }),
            },
            { maxRetries: 2, baseDelayMs: 1000 }
          );

          if (!falRes.ok) {
            const error = await falRes.json().catch(() => ({}));
            throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
          }

          const falData = await falRes.json();
          images = falData.images?.map((img: any) => img.url) || [];
          break;
        }

        case 'openai': {
          const oaiRes = await fetchWithRetry(
            'https://api.openai.com/v1/images/generations',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt,
                n: 1, // DALL-E 3 only supports 1
                size: '1024x1024',
                quality: 'standard',
              }),
            },
            { maxRetries: 2, baseDelayMs: 1000 }
          );

          if (!oaiRes.ok) {
            const error = await oaiRes.json().catch(() => ({}));
            throw new Error(error.error?.message || `DALL-E error ${oaiRes.status}`);
          }

          const oaiData = await oaiRes.json();
          images = oaiData.data?.map((img: any) => img.url) || [];
          break;
        }

        default:
          return errorResponse('Invalid provider', 400);
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

    return errorResponse(error.message || 'Internal server error', 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
