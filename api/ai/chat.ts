// Edge Function: AI Chat Router
// Suporta: Gemini, OpenRouter, OpenAI
// Runtime: Edge (baixa latencia)

export const config = {
  runtime: 'edge',
  regions: ['gru1', 'iad1', 'sfo1', 'fra1'], // Brasil, EUA Leste/Oeste, Europa
};

// Rate limiting em memoria (por request)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Estimativa de tokens
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface ChatRequest {
  provider: 'gemini' | 'openrouter' | 'openai';
  message: string;
  systemPrompt?: string;
  history?: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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
    // Parse request
    const body: ChatRequest = await req.json();
    const { provider, message, systemPrompt, history, model, temperature = 0.7, maxTokens = 4096 } = body;

    // Validacao basica
    if (!provider || !message) {
      return new Response(JSON.stringify({ error: 'provider and message required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limit por IP
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`chat:${ip}`, 60, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Wait 1 minute.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // API Keys (environment variables)
    const apiKeys: Record<string, string> = {
      gemini: process.env.GEMINI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
    };

    const apiKey = apiKeys[provider];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `${provider} API key not configured` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let response: string;
    const startTime = Date.now();

    switch (provider) {
      case 'gemini': {
        const geminiModel = model || 'gemini-2.0-flash-exp';
        const contents = history?.length
          ? [
              ...history.map(h => ({
                role: h.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: h.content }],
              })),
              { role: 'user', parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${message}` : message }] },
            ]
          : [{ role: 'user', parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${message}` : message }] }];

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: { temperature, maxOutputTokens: maxTokens },
            }),
          }
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
        const messages = [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...(history || []),
          { role: 'user', content: message },
        ];

        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://agenciabase.tech',
            'X-Title': 'AgenciaBase',
          },
          body: JSON.stringify({
            model: orModel,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

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
        const messages = [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...(history || []),
          { role: 'user', content: message },
        ];

        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: oaiModel,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!oaiRes.ok) {
          const error = await oaiRes.json();
          throw new Error(error.error?.message || `OpenAI error ${oaiRes.status}`);
        }

        const oaiData = await oaiRes.json();
        response = oaiData.choices?.[0]?.message?.content || '';
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid provider' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    const responseTime = Date.now() - startTime;
    const inputTokens = estimateTokens(message + (systemPrompt || ''));
    const outputTokens = estimateTokens(response);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          response,
          provider,
          model: model || 'default',
          usage: {
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            responseTimeMs: responseTime,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error: any) {
    console.error('Chat API error:', error);
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
