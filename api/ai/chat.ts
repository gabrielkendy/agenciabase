// Edge Function: AI Chat Router
// Suporta: Gemini, OpenRouter, OpenAI
// Runtime: Edge (baixa latencia)
// Features: Retry, Circuit Breaker, Validation, Structured Logging
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

interface ChatRequest {
  provider: 'gemini' | 'openrouter' | 'openai';
  message: string;
  systemPrompt?: string;
  history?: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string; // Fallback API key
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function validateRequest(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  errors.push(...validate.required(body.provider, 'provider'));
  errors.push(...validate.required(body.message, 'message'));
  errors.push(...validate.enum(body.provider, 'provider', ['gemini', 'openrouter', 'openai']));
  errors.push(...validate.string(body.message, 'message', { minLength: 1, maxLength: 50000 }));
  if (body.temperature !== undefined) {
    errors.push(...validate.number(body.temperature, 'temperature', { min: 0, max: 2 }));
  }
  if (body.maxTokens !== undefined) {
    errors.push(...validate.number(body.maxTokens, 'maxTokens', { min: 1, max: 128000 }));
  }
  return { valid: errors.length === 0, errors };
}

// Get API key with fallback chain
function getApiKey(provider: string, req: Request, body: ChatRequest): string {
  const envKeys: Record<string, string | undefined> = {
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    openai: process.env.OPENAI_API_KEY,
  };
  if (envKeys[provider]) {
    console.log(`[API Key] Usando env var para ${provider}`);
    return envKeys[provider]!;
  }
  const headerKey = req.headers.get('X-API-Key');
  if (headerKey) {
    console.log(`[API Key] Usando header X-API-Key`);
    return headerKey;
  }
  if (body.apiKey) {
    console.log(`[API Key] Usando body.apiKey`);
    return body.apiKey;
  }
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
    const body: ChatRequest = await req.json();
    const { provider, message, systemPrompt, history, model, temperature = 0.7, maxTokens = 4096 } = body;

    const validation = validateRequest(body);
    if (!validation.valid) {
      structuredLog.warn('chat', 'validation_failed', { errors: validation.errors, requestId });
      return errorResponse(validation.errors.join(', '), 400);
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = edgeRateLimit.check(`chat:${ip}`, 60, 60000);

    if (!rateLimit.allowed) {
      structuredLog.warn('chat', 'rate_limit_exceeded', { ip, requestId });
      return errorResponse('Rate limit exceeded. Wait 1 minute.', 429, edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 60));
    }

    if (circuitBreaker.isOpen(provider)) {
      structuredLog.warn('chat', 'circuit_open', { provider, requestId });
      return errorResponse(`${provider} temporarily unavailable. Try again later.`, 503);
    }

    const apiKey = getApiKey(provider, req, body);
    if (!apiKey) {
      return errorResponse(`${provider} API key não configurada. Configure nas variáveis de ambiente do Vercel ou nas configurações.`, 500);
    }

    let response: string = '';
    let actualModel = model || 'default';

    structuredLog.info('chat', 'request_start', { provider, model: actualModel, messageLength: message.length, requestId });

    try {
      switch (provider) {
        case 'gemini': {
          const geminiModel = model || 'gemini-2.0-flash-exp';
          actualModel = geminiModel;

          const contents = history?.length
            ? [
                ...history.map(h => ({
                  role: h.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: h.content }],
                })),
                { role: 'user', parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${message}` : message }] },
              ]
            : [{ role: 'user', parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${message}` : message }] }];

          const geminiRes = await fetchWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents,
                generationConfig: { temperature, maxOutputTokens: maxTokens },
              }),
            },
            { maxRetries: 2, baseDelayMs: 500 }
          );

          if (!geminiRes.ok) {
            const error = await geminiRes.json();
            throw new Error(error.error?.message || `Gemini error ${geminiRes.status}`);
          }

          const geminiData = await geminiRes.json();
          response = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          break;
        }

        case 'openrouter': {
          const orModel = model || 'google/gemini-2.0-flash-exp:free';
          actualModel = orModel;

          const messages = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...(history || []),
            { role: 'user', content: message },
          ];

          const orRes = await fetchWithRetry(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://agenciabase.tech',
                'X-Title': 'AgenciaBase',
              },
              body: JSON.stringify({ model: orModel, messages, temperature, max_tokens: maxTokens }),
            },
            { maxRetries: 2, baseDelayMs: 500 }
          );

          if (!orRes.ok) {
            const error = await orRes.json();
            throw new Error(error.error?.message || `OpenRouter error ${orRes.status}`);
          }

          const orData = await orRes.json();
          response = orData.choices?.[0]?.message?.content || '';
          break;
        }

        case 'openai': {
          const oaiModel = model || 'gpt-4o-mini';
          actualModel = oaiModel;

          const messages = [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...(history || []),
            { role: 'user', content: message },
          ];

          const oaiRes = await fetchWithRetry(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ model: oaiModel, messages, temperature, max_tokens: maxTokens }),
            },
            { maxRetries: 2, baseDelayMs: 500 }
          );

          if (!oaiRes.ok) {
            const error = await oaiRes.json();
            throw new Error(error.error?.message || `OpenAI error ${oaiRes.status}`);
          }

          const oaiData = await oaiRes.json();
          response = oaiData.choices?.[0]?.message?.content || '';
          break;
        }

        default:
          return errorResponse('Invalid provider', 400);
      }

      circuitBreaker.recordSuccess(provider);

    } catch (providerError: any) {
      circuitBreaker.recordFailure(provider);
      throw providerError;
    }

    const responseTime = Date.now() - startTime;
    const inputTokens = estimateTokens(message + (systemPrompt || ''));
    const outputTokens = estimateTokens(response);

    structuredLog.request('chat', 'request_complete', startTime, true, {
      provider, model: actualModel, inputTokens, outputTokens, requestId,
    });

    return successResponse(
      {
        response,
        provider,
        model: actualModel,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, responseTimeMs: responseTime },
      },
      {
        ...edgeRateLimit.headers(rateLimit.remaining, rateLimit.resetIn, 60),
        ...securityHeaders,
        'X-Request-ID': requestId,
        'Cache-Control': 'no-store',
      }
    );

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    structuredLog.error('chat', 'request_failed', error, { requestId, duration: responseTime });
    return errorResponse(error.message || 'Internal server error', 500, {
      ...securityHeaders,
      'X-Request-ID': requestId,
    });
  }
}
