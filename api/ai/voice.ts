// Edge Function: AI Voice Synthesis
// Suporta: ElevenLabs
// Runtime: Edge
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

// ElevenLabs voices
const VOICES: Record<string, string> = {
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

// Validate request
function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  errors.push(...validate.required(body.text, 'text'));
  errors.push(...validate.string(body.text, 'text', { minLength: 1, maxLength: 5000 }));

  if (body.stability !== undefined) {
    errors.push(...validate.number(body.stability, 'stability', { min: 0, max: 1 }));
  }

  if (body.similarityBoost !== undefined) {
    errors.push(...validate.number(body.similarityBoost, 'similarityBoost', { min: 0, max: 1 }));
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
    const body: VoiceRequest = await req.json();
    const { text, voice, voiceId, stability = 0.5, similarityBoost = 0.75 } = body;

    // Validate
    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('voice', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    // Rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`voice:${ip}`, 20, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('voice', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Voice: 20/min', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 20));
    }

    // Check circuit breaker
    if (circuitBreaker.isOpen('elevenlabs')) {
      structuredLog.warn('voice', 'circuit_open', { provider: 'elevenlabs', requestId });
      return errorResponse('ElevenLabs temporarily unavailable. Try again later.', 503);
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return errorResponse('ElevenLabs API key not configured', 500);
    }

    // Resolve voice ID
    const resolvedVoiceId = voiceId || (voice ? VOICES[voice] : VOICES['daniel-pt']);

    if (!resolvedVoiceId) {
      return errorResponse('Invalid voice', 400);
    }

    structuredLog.info('voice', 'request_start', { voiceId: resolvedVoiceId, textLength: text.length, requestId });

    try {
      const elRes = await fetchWithRetry(
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
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );

      if (!elRes.ok) {
        const error = await elRes.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || `ElevenLabs error ${elRes.status}`);
      }

      // Record success
      circuitBreaker.recordSuccess('elevenlabs');

      // Return audio as base64 for easier handling
      const audioBuffer = await elRes.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

      const responseTime = Date.now() - startTime;

      structuredLog.request('voice', 'request_complete', startTime, true, {
        voiceId: resolvedVoiceId,
        textLength: text.length,
        requestId,
      });

      return successResponse(
        {
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          format: 'mp3',
          voiceId: resolvedVoiceId,
          textLength: text.length,
          responseTimeMs: responseTime,
        },
        {
          ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 20),
          ...securityHeaders,
          'X-Request-ID': requestId,
          'Cache-Control': 'public, max-age=86400',
        }
      );

    } catch (providerError: any) {
      circuitBreaker.recordFailure('elevenlabs');
      throw providerError;
    }

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    structuredLog.error('voice', 'request_failed', error, {
      requestId,
      duration: responseTime,
    });

    return errorResponse(error.message || 'Internal server error', 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
