// Edge Function: AI Image Generation
// Suporta: Freepik (Mystic, Seedream, Flux, Gemini), FAL.ai, OpenAI DALL-E
// Runtime: Edge com fallback para Serverless (para polling)

export const config = {
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'],
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
    const body: ImageRequest = await req.json();
    const { provider, model, prompt, negativePrompt, numImages = 1, size = '1:1', quality = '2k' } = body;

    if (!provider || !prompt) {
      return new Response(JSON.stringify({ error: 'provider and prompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`image:${ip}`, 30, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKeys: Record<string, string> = {
      freepik: process.env.FREEPIK_API_KEY || '',
      falai: process.env.FALAI_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `${provider} API key not configured` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let images: string[] = [];
    const startTime = Date.now();

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

        const fpRes = await fetch(`https://api.freepik.com/v1${endpoint}`, {
          method: 'POST',
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

        const fpData = await fpRes.json();

        // Handle async generation
        if (fpData.data?.id && fpData.data?.status !== 'COMPLETED') {
          // Poll for results
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

        const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
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
        });

        if (!falRes.ok) {
          const error = await falRes.json().catch(() => ({}));
          throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
        }

        const falData = await falRes.json();
        images = falData.images?.map((img: any) => img.url) || [];
        break;
      }

      case 'openai': {
        const oaiRes = await fetch('https://api.openai.com/v1/images/generations', {
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
        });

        if (!oaiRes.ok) {
          const error = await oaiRes.json().catch(() => ({}));
          throw new Error(error.error?.message || `DALL-E error ${oaiRes.status}`);
        }

        const oaiData = await oaiRes.json();
        images = oaiData.data?.map((img: any) => img.url) || [];
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          images,
          provider,
          model,
          count: images.length,
          responseTimeMs: responseTime,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600', // Cache 1h
        },
      }
    );
  } catch (error: any) {
    console.error('Image API error:', error);
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
