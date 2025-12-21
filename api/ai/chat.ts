// API Route: AI Chat
// Runtime: Node.js (Vercel Serverless)
// Providers: Gemini, OpenRouter, OpenAI

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { provider = 'gemini', message, systemPrompt, history = [], model, temperature = 0.7, apiKey: bodyApiKey } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message é obrigatório' });
    }

    // Get API key based on provider
    const getApiKey = (prov: string): string => {
      const envKeys: Record<string, string | undefined> = {
        gemini: process.env.GEMINI_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY,
        openai: process.env.OPENAI_API_KEY,
      };
      return envKeys[prov] || (req.headers['x-api-key'] as string) || bodyApiKey || '';
    };

    const apiKey = getApiKey(provider);
    if (!apiKey) {
      return res.status(500).json({ success: false, error: `${provider} API key não configurada.` });
    }

    let response = '';

    // ============ GEMINI ============
    if (provider === 'gemini') {
      const contents = [];
      
      if (systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: `System: ${systemPrompt}` }] });
        contents.push({ role: 'model', parts: [{ text: 'Entendido.' }] });
      }
      
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
      
      contents.push({ role: 'user', parts: [{ text: message }] });

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { temperature, maxOutputTokens: 8192 },
          }),
        }
      );

      if (!geminiRes.ok) {
        const error = await geminiRes.json().catch(() => ({}));
        throw new Error(error.error?.message || `Gemini error ${geminiRes.status}`);
      }

      const data = await geminiRes.json();
      response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // ============ OPENROUTER ============
    else if (provider === 'openrouter') {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      for (const msg of history) messages.push({ role: msg.role, content: msg.content });
      messages.push({ role: 'user', content: message });

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://agenciabase.tech',
        },
        body: JSON.stringify({
          model: model || 'google/gemma-2-9b-it:free',
          messages,
          temperature,
        }),
      });

      if (!orRes.ok) {
        const error = await orRes.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenRouter error ${orRes.status}`);
      }

      const data = await orRes.json();
      response = data.choices?.[0]?.message?.content || '';
    }

    // ============ OPENAI ============
    else if (provider === 'openai') {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      for (const msg of history) messages.push({ role: msg.role, content: msg.content });
      messages.push({ role: 'user', content: message });

      const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          temperature,
        }),
      });

      if (!oaiRes.ok) {
        const error = await oaiRes.json().catch(() => ({}));
        throw new Error(error.error?.message || `OpenAI error ${oaiRes.status}`);
      }

      const data = await oaiRes.json();
      response = data.choices?.[0]?.message?.content || '';
    }

    return res.status(200).json({
      success: true,
      data: { response, provider, model },
    });

  } catch (error: any) {
    console.error('[Chat API Error]', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Erro interno' });
  }
}
