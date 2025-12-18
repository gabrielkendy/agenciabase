// Edge Function: AI Tools
// Suporta: Upscale, Remove BG, Relight, Style Transfer, Expand, etc.
// Runtime: Serverless (algumas ferramentas precisam de mais tempo)
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
  runtime: 'nodejs',
  maxDuration: 120, // 2 minutos
};

// Freepik tools endpoints
const FREEPIK_TOOLS: Record<string, { endpoint: string; method: string }> = {
  'upscale': { endpoint: '/ai/image-upscaler', method: 'POST' },
  'upscale-precision': { endpoint: '/ai/image-upscaler-precision-v2', method: 'POST' },
  'remove-bg': { endpoint: '/ai/beta/remove-background', method: 'POST' },
  'relight': { endpoint: '/ai/image-relight', method: 'POST' },
  'style-transfer': { endpoint: '/ai/image-style-transfer', method: 'POST' },
  'expand': { endpoint: '/ai/image-expand/flux-pro', method: 'POST' },
  'image-to-prompt': { endpoint: '/ai/image-to-prompt', method: 'POST' },
  'improve-prompt': { endpoint: '/ai/improve-prompt', method: 'POST' },
  'skin-enhancer': { endpoint: '/ai/skin-enhancer/flexible', method: 'POST' },
  'icon-gen': { endpoint: '/ai/text-to-icon/preview', method: 'POST' },
  'sound-effects': { endpoint: '/ai/sound-effects', method: 'POST' },
};

interface ToolRequest {
  tool: string;
  image?: string; // base64 or URL
  prompt?: string;
  options?: Record<string, any>;
}

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  errors.push(...validate.required(body.tool, 'tool'));

  const validTools = Object.keys(FREEPIK_TOOLS);
  if (body.tool && !validTools.includes(body.tool)) {
    errors.push(`tool must be one of: ${validTools.join(', ')}`);
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
    const body: ToolRequest = await req.json();
    const { tool, image, prompt, options = {} } = body;

    // Validate
    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('tools', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    const toolConfig = FREEPIK_TOOLS[tool];

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`tools:${ip}`, 30, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('tools', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Tools: 30/min', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 30));
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen('freepik-tools')) {
      structuredLog.warn('tools', 'circuit_open', { tool, requestId });
      return errorResponse('Freepik Tools temporarily unavailable. Try again later.', 503);
    }

    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      return errorResponse('Freepik API key not configured', 500);
    }

    structuredLog.info('tools', 'request_start', { tool, requestId });

    try {
      // Build request body based on tool
      let requestBody: Record<string, any> = {};

      switch (tool) {
        case 'upscale':
        case 'upscale-precision':
          if (!image) throw new Error('image required for upscale');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            scale: options.scale || 4,
            creativity: options.creativity || 0.5,
          };
          break;

        case 'remove-bg':
          if (!image) throw new Error('image required for remove-bg');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
          };
          break;

        case 'relight':
          if (!image) throw new Error('image required for relight');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            light_source: options.lightSource || 'left',
          };
          break;

        case 'style-transfer':
          if (!image || !options.styleImage) throw new Error('image and styleImage required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            style_image: options.styleImage.startsWith('data:')
              ? options.styleImage.split(',')[1]
              : options.styleImage,
          };
          break;

        case 'expand':
          if (!image) throw new Error('image required for expand');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            direction: options.direction || 'all',
            prompt: prompt || '',
          };
          break;

        case 'image-to-prompt':
          if (!image) throw new Error('image required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
          };
          break;

        case 'improve-prompt':
          if (!prompt) throw new Error('prompt required');
          requestBody = { prompt };
          break;

        case 'skin-enhancer':
          if (!image) throw new Error('image required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
          };
          break;

        case 'icon-gen':
          if (!prompt) throw new Error('prompt required');
          requestBody = { prompt };
          break;

        case 'sound-effects':
          if (!prompt) throw new Error('prompt required');
          requestBody = { prompt, duration: options.duration || 5 };
          break;

        default:
          throw new Error('Tool not implemented');
      }

      // Make API request
      const fpRes = await fetchWithRetry(
        `https://api.freepik.com/v1${toolConfig.endpoint}`,
        {
          method: toolConfig.method,
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

      let result = await fpRes.json();

      // Handle async tools (poll for completion)
      if (result.data?.id && result.data?.status !== 'COMPLETED') {
        let attempts = 0;
        const maxAttempts = 60;

        structuredLog.info('tools', 'polling_start', { taskId: result.data.id, tool, requestId });

        while (attempts < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000));

          const statusRes = await fetch(
            `https://api.freepik.com/v1${toolConfig.endpoint}/${result.data.id}`,
            {
              headers: {
                'Accept': 'application/json',
                'x-freepik-api-key': apiKey,
              },
            }
          );

          const statusData = await statusRes.json();

          if (statusData.data?.status === 'COMPLETED') {
            result = statusData;
            structuredLog.info('tools', 'polling_complete', { taskId: result.data.id, attempts, requestId });
            break;
          }

          if (statusData.data?.status === 'FAILED') {
            throw new Error('Tool processing failed');
          }

          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error('Tool processing timeout');
        }
      }

      // Record success
      circuitBreaker.recordSuccess('freepik-tools');

      // Extract result based on tool type
      let output: any = null;

      if (result.data?.generated?.[0]?.url) {
        output = { url: result.data.generated[0].url };
      } else if (result.data?.image?.url) {
        output = { url: result.data.image.url };
      } else if (result.data?.[0]?.base64) {
        output = { base64: `data:image/png;base64,${result.data[0].base64}` };
      } else if (result.data?.prompt) {
        output = { prompt: result.data.prompt };
      } else if (result.data?.audio?.url) {
        output = { url: result.data.audio.url };
      } else {
        output = result.data;
      }

      const responseTime = Date.now() - startTime;

      structuredLog.request('tools', 'request_complete', startTime, true, {
        tool,
        requestId,
      });

      return successResponse(
        {
          tool,
          output,
          responseTimeMs: responseTime,
        },
        {
          ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 30),
          ...securityHeaders,
          'X-Request-ID': requestId,
          'Cache-Control': 'public, max-age=3600',
        }
      );

    } catch (providerError: any) {
      circuitBreaker.recordFailure('freepik-tools');
      throw providerError;
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    structuredLog.error('tools', 'request_failed', error, {
      requestId,
      duration: responseTime,
    });

    return errorResponse(error.message || 'Internal server error', 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
