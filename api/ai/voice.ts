// Edge Function: AI Voice Synthesis
// Suporta: ElevenLabs
// Runtime: Edge

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

// ElevenLabs voices
const VOICES = {
  'daniel-pt': 'onwK4e9ZLuTAKqWW03F9', // Portugues BR
  'sarah-en': 'EXAVITQu4vr4xnSDxMaL',
  'rachel-en': '21m00Tcm4TlvDq8ikWAM',
  'adam-en': 'pNInz6obpgDQGcFmaJgB',
  'sam-en': 'yoZ06aMxZJJ28mfd3POQ',
};

interface VoiceRequest {
  text: string;
  voice?: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
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
    const body: VoiceRequest = await req.json();
    const { text, voice, voiceId, stability = 0.5, similarityBoost = 0.75 } = body;

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'text required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Limite de caracteres
    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: 'Text too long. Max 5000 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`voice:${ip}`, 20, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Voice: 20/min' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ElevenLabs API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Resolve voice ID
    const resolvedVoiceId = voiceId || (voice ? VOICES[voice as keyof typeof VOICES] : VOICES['daniel-pt']);

    if (!resolvedVoiceId) {
      return new Response(JSON.stringify({ error: 'Invalid voice' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    if (!elRes.ok) {
      const error = await elRes.json().catch(() => ({}));
      throw new Error(error.detail?.message || error.message || `ElevenLabs error ${elRes.status}`);
    }

    // Return audio as base64 for easier handling
    const audioBuffer = await elRes.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          format: 'mp3',
          voiceId: resolvedVoiceId,
          textLength: text.length,
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
    console.error('Voice API error:', error);
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
