import { tokenTracker } from '../lib/tokenTracker';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Estimar tokens (aproximacao: 1 token ~= 4 caracteres)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// Original function - used by AgentsPage and ChatPage
export async function sendMessageToGemini(
  message: string,
  systemPrompt: string,
  apiKey: string,
  userId: string = 'anonymous',
  userName?: string
): Promise<string> {
  const inputText = systemPrompt + '\n\n' + message;
  const inputTokens = estimateTokens(inputText);
  const startTime = performance.now();

  try {
    const response = await fetch(`${GEMINI_API_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: inputText }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    });

    const responseTimeMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const error = await response.json();
      tokenTracker.trackChat({
        userId,
        userName,
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        inputTokens,
        outputTokens: 0,
        responseTimeMs,
        success: false,
        error: error.error?.message || `Erro ${response.status}`
      });
      throw new Error(error.error?.message || 'Erro na API do Gemini');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const outputText = data.candidates[0].content.parts[0].text;
      const outputTokens = estimateTokens(outputText);

      tokenTracker.trackChat({
        userId,
        userName,
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        inputTokens,
        outputTokens,
        responseTimeMs,
        success: true
      });

      return outputText;
    }

    throw new Error('Resposta inválida do Gemini');
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    tokenTracker.trackChat({
      userId,
      userName,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      inputTokens,
      outputTokens: 0,
      responseTimeMs,
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

// Extended function for Creator Studio - supports chat history
export async function sendMessageToGeminiWithHistory(
  message: string,
  apiKey: string,
  history: { role: string; content: string }[] = [],
  model: string = 'gemini-2.0-flash-exp',
  userId: string = 'anonymous',
  userName?: string
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

  const inputTokens = estimateTokens(
    history.map(h => h.content).join(' ') + ' ' + message
  );
  const startTime = performance.now();

  try {
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

    const responseTimeMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const error = await response.json();
      tokenTracker.trackChat({
        userId,
        userName,
        provider: 'gemini',
        model,
        inputTokens,
        outputTokens: 0,
        responseTimeMs,
        success: false,
        error: error.error?.message || `Erro ${response.status}`
      });
      throw new Error(error.error?.message || 'Erro na API do Gemini');
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
      const outputText = data.candidates[0].content.parts[0].text;
      const outputTokens = estimateTokens(outputText);

      tokenTracker.trackChat({
        userId,
        userName,
        provider: 'gemini',
        model,
        inputTokens,
        outputTokens,
        responseTimeMs,
        success: true
      });

      return outputText;
    }

    throw new Error('Resposta inválida do Gemini');
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    tokenTracker.trackChat({
      userId,
      userName,
      provider: 'gemini',
      model,
      inputTokens,
      outputTokens: 0,
      responseTimeMs,
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}

export async function generateWithGemini(
  prompt: string,
  apiKey: string,
  temperature: number = 0.7,
  userId: string = 'anonymous',
  userName?: string
): Promise<string> {
  const inputTokens = estimateTokens(prompt);
  const startTime = performance.now();

  try {
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

    const responseTimeMs = Math.round(performance.now() - startTime);

    if (!response.ok) {
      tokenTracker.trackChat({
        userId,
        userName,
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        inputTokens,
        outputTokens: 0,
        responseTimeMs,
        success: false,
        error: `Erro ${response.status}`
      });
      throw new Error('Erro na API do Gemini');
    }

    const data = await response.json();
    const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const outputTokens = estimateTokens(outputText);

    tokenTracker.trackChat({
      userId,
      userName,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      inputTokens,
      outputTokens,
      responseTimeMs,
      success: true
    });

    return outputText;
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - startTime);
    tokenTracker.trackChat({
      userId,
      userName,
      provider: 'gemini',
      model: 'gemini-2.0-flash-exp',
      inputTokens,
      outputTokens: 0,
      responseTimeMs,
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    throw error;
  }
}
