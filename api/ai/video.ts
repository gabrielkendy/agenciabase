// Edge Function: AI Video Generation
// Suporta: Freepik (Kling, Seedance, PixVerse, MiniMax), FAL.ai
// Runtime: Serverless (requer polling longo)

export const config = {
  runtime: 'nodejs18.x', // Videos precisam de mais tempo
  maxDuration: 300, // 5 minutos max
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
    const body: VideoRequest = await req.json();
    const { provider, model, image, prompt = 'Smooth natural motion', duration = '5' } = body;

    if (!provider || !image) {
      return new Response(JSON.stringify({ error: 'provider and image required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit - mais restritivo para video
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`video:${ip}`, 10, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Videos: 10/min' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKeys: Record<string, string> = {
      freepik: process.env.FREEPIK_API_KEY || '',
      falai: process.env.FALAI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `${provider} API key not configured` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let videoUrl = '';
    const startTime = Date.now();

    switch (provider) {
      case 'freepik': {
        const endpoint = FREEPIK_VIDEO_ENDPOINTS[model];
        if (!endpoint) {
          return new Response(JSON.stringify({ error: 'Invalid video model' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Prepare image data
        const imageData = image.startsWith('data:')
          ? image.split(',')[1]
          : image;

        const fpRes = await fetch(`https://api.freepik.com/v1${endpoint}`, {
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
        });

        if (!fpRes.ok) {
          const error = await fpRes.json().catch(() => ({}));
          throw new Error(error.message || error.detail || `Freepik error ${fpRes.status}`);
        }

        const fpData = await fpRes.json();

        // Poll for video completion
        if (fpData.data?.id) {
          let attempts = 0;
          const maxAttempts = 120; // 4 minutos max polling

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

        const falRes = await fetch(`https://fal.run/${falEndpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!falRes.ok) {
          const error = await falRes.json().catch(() => ({}));
          throw new Error(error.detail || error.message || `FAL.ai error ${falRes.status}`);
        }

        const falData = await falRes.json();
        videoUrl = falData.video?.url || falData.video_url || falData.output?.video || '';
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!videoUrl) {
      throw new Error('No video URL returned');
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          videoUrl,
          provider,
          model,
          responseTimeMs: responseTime,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400', // Cache 24h
        },
      }
    );
  } catch (error: any) {
    console.error('Video API error:', error);
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
