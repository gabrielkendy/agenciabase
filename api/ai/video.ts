// Edge Function: AI Video Generation
// Suporta: Freepik (Kling, Seedance, PixVerse, MiniMax), FAL.ai
// Runtime: Serverless (requer polling longo)
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
  runtime: 'nodejs18.x', // Videos precisam de mais tempo
  maxDuration: 300, // 5 minutos max
};

// Freepik video endpoints
const FREEPIK_VIDEO_ENDPOINTS: Record<string, string> = {
  'kling-v2-5-pro': '/ai/image-to-video/kling-v2-5-pro',
  'kling-v2-1-pro': '/ai/image-to-video/kling-v2-1-pro',
  'seedance-pro': '/ai/image-to-video/seedance-pro-1080p',
  'pixverse-v5': '/ai/image-to-video/pixverse-v5',
  'pixverse-transition': '/ai/image-to-video/pixverse-v5-transition',
  'minimax-hailuo': '/ai/image-to-video/minimax-hailuo-02-1080p',
};

interface VideoRequest {
  provider: 'freepik' | 'falai';
  model: string;
  image: string; // URL or base64
  prompt?: string;
  duration?: string;
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  errors.push(...validate.required(body.provider, 'provider'));
  errors.push(...validate.required(body.image, 'image'));
  errors.push(...validate.enum(body.provider, 'provider', ['freepik', 'falai']));

  // Validate image is base64 or URL
  if (body.image && !body.image.startsWith('data:') && !body.image.startsWith('http')) {
    errors.push(...validate.base64(body.image, 'image'));
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
    const body: VideoRequest = await req.json();
    const { provider, model, image, prompt = 'Smooth natural motion', duration = '5' } = body;

    // Validate
    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('video', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    // Rate limit - mais restritivo para video
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`video:${ip}`, 10, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('video', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Videos: 10/min', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 10));
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen(provider)) {
      structuredLog.warn('video', 'circuit_open', { provider, requestId });
      return errorResponse(`${provider} temporarily unavailable. Try again later.`, 503);
    }

    const apiKeys: Record<string, string> = {
      freepik: process.env.FREEPIK_API_KEY || '',
      falai: process.env.FALAI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return errorResponse(`${provider} API key not configured`, 500);
    }

    let videoUrl = '';

    structuredLog.info('video', 'request_start', { provider, model, requestId });

    try {
      switch (provider) {
        case 'freepik': {
          const endpoint = FREEPIK_VIDEO_ENDPOINTS[model];
          if (!endpoint) {
            return errorResponse('Invalid video model', 400);
          }

          // Prepare image data
          const imageData = image.startsWith('data:')
            ? image.split(',')[1]
            : image;

          const fpRes = await fetchWithRetry(
            `https://api.freepik.com/v1${endpoint}`,
            {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-freepik-api-key': apiKey,
              },
              body: JSON.stringify({
                image: imageData,
                prompt,
              }),
            },
            { maxRetries: 2, baseDelayMs: 2000 }
          );

          if (!fpRes.ok) {
            const error = await fpRes.json().catch(() => ({}));
            throw new Error(error.message || error.detail || `Freepik error ${fpRes.status}`);
          }

          const fpData = await fpRes.json();

          // Poll for video completion
          if (fpData.data?.id) {
            let attempts = 0;
            const maxAttempts = 120; // 4 minutos max polling

            structuredLog.info('video', 'polling_start', { taskId: fpData.data.id, requestId });

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
                videoUrl = statusData.data.video?.url || statusData.data.generated?.[0]?.url || '';
                structuredLog.info('video', 'polling_complete', { taskId: fpData.data.id, attempts, requestId });
                break;
              }

              if (statusData.data?.status === 'FAILED') {
                throw new Error('Video generation failed');
              }

              attempts++;
            }

            if (attempts >= maxAttempts) {
              throw new Error('Video generation timeout');
            }
          } else if (fpData.data?.video?.url) {
            videoUrl = fpData.data.video.url;
          }
          break;
        }

        case 'falai': {
          const falEndpoint = model.startsWith('fal-ai/') ? model : `fal-ai/${model}`;

          let requestBody: Record<string, any>;

          if (model.includes('kling')) {
            requestBody = {
              image_url: image,
              prompt,
              duration,
              aspect_ratio: '16:9',
            };
          } else {
            requestBody = {
              image_url: image,
              motion_bucket_id: 127,
              fps: 7,
              cond_aug: 0.02,
            };
          }

          const falRes = await fetchWithRetry(
            `https://fal.run/${falEndpoint}`,
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

    if (!videoUrl) {
      throw new Error('No video URL returned');
    }

    const responseTime = Date.now() - startTime;

    structuredLog.request('video', 'request_complete', startTime, true, {
      provider,
      model,
      requestId,
    });

    return successResponse(
      {
        videoUrl,
        provider,
        model,
        responseTimeMs: responseTime,
      },
      {
        ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 10),
        ...securityHeaders,
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=86400',
      }
    );

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    structuredLog.error('video', 'request_failed', error, {
      requestId,
      duration: responseTime,
    });

    return errorResponse(error.message || 'Internal server error', 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
