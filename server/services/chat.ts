// =============================================================================
// CHAT SERVICE - Chat com IA
// Providers: Gemini, OpenRouter, OpenAI
// =============================================================================

interface ChatParams {
  provider: 'gemini' | 'openrouter' | 'openai';
  message: string;
  systemPrompt?: string;
  history: Array<{ role: string; content: string }>;
  model?: string;
  temperature: number;
}

export async function chatWithAI(params: ChatParams) {
  const { provider, message, systemPrompt, history, model, temperature } = params;

  // Obter API key do ambiente
  const getApiKey = (prov: string): string => {
    const keys: Record<string, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      openrouter: process.env.OPENROUTER_API_KEY,
      openai: process.env.OPENAI_API_KEY,
    };
    return keys[prov] || '';
  };

  const apiKey = getApiKey(provider);
  if (!apiKey) {
    throw new Error(`API Key do ${provider} não configurada no servidor.`);
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

    const modelName = model || 'gemini-2.0-flash-exp';
    console.log(`[Gemini] Chat com ${modelName}`);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini error ${res.status}`);
    }

    const data = await res.json();
    response = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }


  // ============ OPENROUTER ============
  else if (provider === 'openrouter') {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const msg of history) messages.push({ role: msg.role, content: msg.content });
    messages.push({ role: 'user', content: message });

    const modelName = model || 'google/gemma-2-9b-it:free';
    console.log(`[OpenRouter] Chat com ${modelName}`);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://agenciabase.tech',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenRouter error ${res.status}`);
    }

    const data = await res.json();
    response = data.choices?.[0]?.message?.content || '';
  }

  // ============ OPENAI ============
  else if (provider === 'openai') {
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    for (const msg of history) messages.push({ role: msg.role, content: msg.content });
    messages.push({ role: 'user', content: message });

    const modelName = model || 'gpt-4o-mini';
    console.log(`[OpenAI] Chat com ${modelName}`);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI error ${res.status}`);
    }

    const data = await res.json();
    response = data.choices?.[0]?.message?.content || '';
  }

  return { response, provider, model };
}
