const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Original function - used by AgentsPage and ChatPage
export async function sendMessageToGemini(
  message: string,
  systemPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt + '\n\n' + message }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro na API do Gemini');
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Resposta inválida do Gemini');
}

// Extended function for Creator Studio - supports chat history
export async function sendMessageToGeminiWithHistory(
  message: string,
  apiKey: string,
  history: { role: string; content: string }[] = [],
  model: string = 'gemini-2.0-flash-exp'
): Promise<string> {
  // Build contents array with history
  const contents = [
    ...history.map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    })),
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ];

  const response = await fetch(`${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro na API do Gemini');
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Resposta inválida do Gemini');
}

export async function generateWithGemini(
  prompt: string,
  apiKey: string,
  temperature: number = 0.7
): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: 2048 }
    })
  });

  if (!response.ok) throw new Error('Erro na API do Gemini');
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
