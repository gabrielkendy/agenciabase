// Edge Function: AI Voice Synthesis
// Suporta: ElevenLabs
// Runtime: Edge
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
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'],
};

const VOICES: Record<string, string> = {
  'daniel-pt': 'onwK4e9ZLuTAKqWW03F9',
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
  apiKey?: string;
}

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

function getApiKey(req: Request, body: VoiceRequest): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
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
    const body: VoiceRequest = await req.json();
    const { text, voice, voiceId, stability = 0.5, similarityBoost = 0.75 } = body;

    const validation = validateRequest(body);
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`voice:${ip}`, 20, 60000);

    if (!rateLimit.allowed) {
      return errorResponse('Rate limit exceeded. Voice: 20/min', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 20));
    }

    if (circuitBreaker.isOpen('elevenlabs')) {
      return errorResponse('ElevenLabs temporariamente indisponível.', 503);
    }

    const apiKey = getApiKey(req, body);
    if (!apiKey) {
      return errorResponse('ElevenLabs API key não configurada. Configure nas variáveis de ambiente do Vercel.', 500);
    }

    const resolvedVoiceId = voiceId || (voice ? VOICES[voice] : VOICES['daniel-pt']);
    if (!resolvedVoiceId) {
      return errorResponse('Voz inválida', 400);
    }

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
            voice_settings: { stability, similarity_boost: similarityBoost },
          }),
        },
        { maxRetries: 2, baseDelayMs: 1000 }
      );

      if (!elRes.ok) {
        const error = await elRes.json().catch(() => ({}));
        throw new Error(error.detail?.message || error.message || `ElevenLabs error ${elRes.status}`);
      }

      circuitBreaker.recordSuccess('elevenlabs');

      const audioBuffer = await elRes.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

      return successResponse(
        {
          audio: `data:audio/mpeg;base64,${base64Audio}`,
          format: 'mp3',
          voiceId: resolvedVoiceId,
          textLength: text.length,
          responseTimeMs: Date.now() - startTime,
        },
        {
          ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 20),
          ...securityHeaders,
          'X-Request-ID': requestId,
        }
      );

    } catch (providerError: any) {
      circuitBreaker.recordFailure('elevenlabs');
      throw providerError;
    }

  } catch (error: any) {
    structuredLog.error('voice', 'request_failed', error, { requestId });
    return errorResponse(error.message || 'Erro interno', 500, { 'X-Request-ID': requestId });
  }
}
