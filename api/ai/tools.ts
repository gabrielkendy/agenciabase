// Edge Function: AI Tools
// Suporta: Upscale, Remove BG, Relight, Style Transfer, Expand, etc.
// Runtime: Serverless (algumas ferramentas precisam de mais tempo)

export const config = {
  runtime: 'nodejs18.x',
  maxDuration: 120, // 2 minutos
};

// Rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);
  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

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

export default async function handler(req: Request): Promise<Response> {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ToolRequest = await req.json();
    const { tool, image, prompt, options = {} } = body;

    if (!tool) {
      return new Response(JSON.stringify({ error: 'tool required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const toolConfig = FREEPIK_TOOLS[tool];
    if (!toolConfig) {
      return new Response(
        JSON.stringify({
          error: 'Invalid tool',
          availableTools: Object.keys(FREEPIK_TOOLS),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`tools:${ip}`, 30, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Tools: 30/min' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.FREEPIK_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Freepik API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

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
    const fpRes = await fetch(`https://api.freepik.com/v1${toolConfig.endpoint}`, {
      method: toolConfig.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!fpRes.ok) {
      const error = await fpRes.json().catch(() => ({}));
      throw new Error(error.message || error.detail || `Freepik error ${fpRes.status}`);
    }

    let result = await fpRes.json();

    // Handle async tools (poll for completion)
    if (result.data?.id && result.data?.status !== 'COMPLETED') {
      let attempts = 0;
      const maxAttempts = 60;

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

    const responseTime = Date.now() - startTime;

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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tool,
          output,
          responseTimeMs: responseTime,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      }
    );
  } catch (error: any) {
    console.error('Tools API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
