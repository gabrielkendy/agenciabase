// Edge Function: AI Tools
// Suporta: Upscale, Remove BG, Relight, Style Transfer, Expand, etc.
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
  maxDuration: 120,
};

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
  image?: string;
  prompt?: string;
  options?: Record<string, any>;
  apiKey?: string;
}

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  errors.push(...validate.required(body.tool, 'tool'));
  const validTools = Object.keys(FREEPIK_TOOLS);
  if (body.tool && !validTools.includes(body.tool)) {
    errors.push(`tool must be one of: ${validTools.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

function getApiKey(req: Request, body: ToolRequest): string {
  if (process.env.FREEPIK_API_KEY) return process.env.FREEPIK_API_KEY;
  const headerKey = req.headers.get('X-API-Key');
  if (headerKey) return headerKey;
  if (body.apiKey) return body.apiKey;
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
    const body: ToolRequest = await req.json();
    const { tool, image, prompt, options = {} } = body;

    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const toolConfig = FREEPIK_TOOLS[tool];

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`tools:${ip}`, 30, 60000);

    if (!rateLimit.allowed) {
      return errorResponse('Rate limit exceeded. Tools: 30/min', 429);
    }

    if (circuitBreaker.isOpen('freepik-tools')) {
      return errorResponse('Freepik Tools temporariamente indisponível.', 503);
    }

    const apiKey = getApiKey(req, body);
    if (!apiKey) {
      return errorResponse('Freepik API key não configurada. Configure nas variáveis de ambiente do Vercel.', 500);
    }

    try {
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
          if (!image) throw new Error('image required');
          requestBody = { image: image.startsWith('data:') ? image.split(',')[1] : image };
          break;
        case 'relight':
          if (!image) throw new Error('image required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            light_source: options.lightSource || 'left',
          };
          break;
        case 'style-transfer':
          if (!image || !options.styleImage) throw new Error('image and styleImage required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            style_image: options.styleImage.startsWith('data:') ? options.styleImage.split(',')[1] : options.styleImage,
          };
          break;
        case 'expand':
          if (!image) throw new Error('image required');
          requestBody = {
            image: image.startsWith('data:') ? image.split(',')[1] : image,
            direction: options.direction || 'all',
            prompt: prompt || '',
          };
          break;
        case 'image-to-prompt':
          if (!image) throw new Error('image required');
          requestBody = { image: image.startsWith('data:') ? image.split(',')[1] : image };
          break;
        case 'improve-prompt':
          if (!prompt) throw new Error('prompt required');
          requestBody = { prompt };
          break;
        case 'skin-enhancer':
          if (!image) throw new Error('image required');
          requestBody = { image: image.startsWith('data:') ? image.split(',')[1] : image };
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

      // Poll for async tools
      if (result.data?.id && result.data?.status !== 'COMPLETED') {
        let attempts = 0;
        while (attempts < 60) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(
            `https://api.freepik.com/v1${toolConfig.endpoint}/${result.data.id}`,
            { headers: { 'Accept': 'application/json', 'x-freepik-api-key': apiKey } }
          );
          const statusData = await statusRes.json();
          if (statusData.data?.status === 'COMPLETED') {
            result = statusData;
            break;
          }
          if (statusData.data?.status === 'FAILED') throw new Error('Processing failed');
          attempts++;
        }
        if (attempts >= 60) throw new Error('Timeout');
      }

      circuitBreaker.recordSuccess('freepik-tools');

      let output: any = null;
      if (result.data?.generated?.[0]?.url) output = { url: result.data.generated[0].url };
      else if (result.data?.image?.url) output = { url: result.data.image.url };
      else if (result.data?.[0]?.base64) output = { base64: `data:image/png;base64,${result.data[0].base64}` };
      else if (result.data?.prompt) output = { prompt: result.data.prompt };
      else if (result.data?.audio?.url) output = { url: result.data.audio.url };
      else output = result.data;

      return successResponse(
        { tool, output, responseTimeMs: Date.now() - startTime },
        { ...securityHeaders, 'X-Request-ID': requestId }
      );

    } catch (providerError: any) {
      circuitBreaker.recordFailure('freepik-tools');
      throw providerError;
    }

  } catch (error: any) {
    structuredLog.error('tools', 'request_failed', error, { requestId });
    return errorResponse(error.message || 'Erro interno', 500, { 'X-Request-ID': requestId });
  }
}
