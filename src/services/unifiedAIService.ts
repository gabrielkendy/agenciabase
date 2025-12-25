 found.id;
    }

    return {
      shouldCreateDemand: true,
      demand: {
        title: data.title || 'Nova demanda',
        briefing: data.briefing || '',
        content_type: data.content_type || 'post',
        channels: data.channels || ['instagram'],
        client_id: clientId,
        status: 'briefing',
        created_by_ai: true,
        media: [],
        caption: data.caption,
        hashtags: data.hashtags,
        tags: data.hashtags?.split(' ').filter((t: string) => t.startsWith('#')) || [],
      },
    };
  } catch {
    return { shouldCreateDemand: false };
  }
}

// Limpar resposta removendo JSON de demanda
export function cleanResponse(response: string): string {
  return response.replace(/\[DEMAND_JSON\].*?\[\/DEMAND_JSON\]/s, '').trim();
}

// Chat simples (sem agente específico)
export async function simpleChat(
  message: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  if (!openRouterService.isConfigured()) {
    throw new Error('OpenRouter não configurado');
  }

  return openRouterService.simpleChat(message, systemPrompt, model);
}

// Treinar conhecimento do agente
export async function trainAgentKnowledge(
  _agent: Agent,
  knowledgeItems: Array<{ content: string; name: string }>
): Promise<string> {
  // Compilar conhecimento em texto formatado
  const knowledge = knowledgeItems
    .map(item => `=== ${item.name} ===\n${item.content}`)
    .join('\n\n---\n\n');

  return knowledge;
}

// Testar conexão com AI
export async function testAIConnection(): Promise<{
  openRouter: boolean;
  openai: boolean;
}> {
  const results = {
    openRouter: false,
    openai: false,
  };

  // Testar OpenRouter
  if (openRouterService.isConfigured()) {
    try {
      await openRouterService.getModels();
      results.openRouter = true;
    } catch {
      results.openRouter = false;
    }
  }

  // Testar OpenAI Assistants
  if (openaiAssistantsServiceV2.isInitialized()) {
    try {
      await openaiAssistantsServiceV2.listAssistants();
      results.openai = true;
    } catch {
      results.openai = false;
    }
  }

  return results;
}

// Gerar sugestões de conteúdo
export async function generateContentSuggestions(
  topic: string,
  platform: string,
  count: number = 5
): Promise<string[]> {
  const prompt = `Gere ${count} ideias criativas de conteúdo para ${platform} sobre o tema "${topic}". 
  Responda APENAS com uma lista numerada, sem explicações adicionais.
  Cada ideia deve ser única e engajante.`;

  const response = await simpleChat(prompt);
  
  // Extrair linhas numeradas
  const lines = response.split('\n').filter(line => /^\d+\./.test(line.trim()));
  return lines.map(line => line.replace(/^\d+\.\s*/, '').trim()).slice(0, count);
}

// Gerar legenda otimizada
export async function generateCaption(
  description: string,
  platform: string,
  tone: 'formal' | 'casual' | 'funny' | 'inspirational' = 'casual'
): Promise<{ caption: string; hashtags: string[] }> {
  const toneMap = {
    formal: 'profissional e corporativo',
    casual: 'descontraído e amigável',
    funny: 'divertido e bem-humorado',
    inspirational: 'inspirador e motivacional',
  };

  const prompt = `Crie uma legenda para ${platform} com tom ${toneMap[tone]}.
  Descrição do conteúdo: ${description}
  
  Responda no formato:
  LEGENDA: [sua legenda aqui]
  HASHTAGS: #hashtag1 #hashtag2 #hashtag3 (máximo 10 hashtags relevantes)`;

  const response = await simpleChat(prompt);

  // Extrair legenda e hashtags
  const captionMatch = response.match(/LEGENDA:\s*(.+?)(?=HASHTAGS:|$)/s);
  const hashtagsMatch = response.match(/HASHTAGS:\s*(.+)/s);

  const caption = captionMatch?.[1]?.trim() || description;
  const hashtagsText = hashtagsMatch?.[1]?.trim() || '';
  const hashtags = hashtagsText.match(/#\w+/g) || [];

  return { caption, hashtags };
}

// Analisar sentimento de texto
export async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  summary: string;
}> {
  const prompt = `Analise o sentimento do seguinte texto e responda APENAS no formato JSON:
  {"sentiment": "positive|neutral|negative", "score": 0.0-1.0, "summary": "breve análise"}
  
  Texto: "${text}"`;

  const response = await simpleChat(prompt);

  try {
    const json = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
    return {
      sentiment: json.sentiment || 'neutral',
      score: parseFloat(json.score) || 0.5,
      summary: json.summary || '',
    };
  } catch {
    return { sentiment: 'neutral', score: 0.5, summary: '' };
  }
}

export default {
  unifiedChat,
  extractDemandFromResponse,
  cleanResponse,
  simpleChat,
  trainAgentKnowledge,
  testAIConnection,
  generateContentSuggestions,
  generateCaption,
  analyzeSentiment,
};
 found.id;
    }

    return {
      shouldCreateDemand: true,
      demand: {
        title: data.title || 'Nova demanda',
        briefing: data.briefing || '',
        content_type: data.content_type || 'post',
        channels: data.channels || ['instagram'],
        client_id: clientId,
        status: 'briefing',
        created_by_ai: true,
        media: [],
        ai_caption: data.caption,
        ai_hashtags: data.hashtags,
      },
    };
  } catch {
    return { shouldCreateDemand: false };
  }
}

// Limpar resposta removendo JSON de demanda
export function cleanResponse(response: string): string {
  return response.replace(/\[DEMAND_JSON\].*?\[\/DEMAND_JSON\]/s, '').trim();
}

// Chat simples (sem agente, direto ao modelo)
export async function quickChat(
  message: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  if (!openRouterService.isConfigured()) {
    throw new Error('OpenRouter não configurado');
  }

  return openRouterService.simpleChat(message, systemPrompt, model);
}

// Gerar conteúdo criativo
export async function generateCreativeContent(
  prompt: string,
  type: 'post' | 'caption' | 'hashtags' | 'script' | 'email' | 'article'
): Promise<string> {
  const typePrompts: Record<string, string> = {
    post: 'Você é um expert em social media. Crie um post engajador e criativo.',
    caption: 'Você é um copywriter expert. Crie uma legenda cativante com emojis e call-to-action.',
    hashtags: 'Você é um especialista em SEO social. Gere hashtags relevantes e populares.',
    script: 'Você é um roteirista de vídeos curtos. Crie um script dinâmico para Reels/TikTok.',
    email: 'Você é um expert em email marketing. Crie um email persuasivo com subject line matador.',
    article: 'Você é um redator de conteúdo. Crie um artigo informativo e bem estruturado.',
  };

  return quickChat(prompt, typePrompts[type] || typePrompts.post);
}

// Analisar sentimento/tom de texto
export async function analyzeContent(
  content: string
): Promise<{ sentiment: string; suggestions: string[] }> {
  const response = await quickChat(
    `Analise o seguinte conteúdo e forneça:
1. Sentimento geral (positivo, negativo, neutro)
2. 3 sugestões de melhoria

Conteúdo: "${content}"

Responda em JSON: {"sentiment": "...", "suggestions": ["...", "...", "..."]}`,
    'Você é um analista de conteúdo digital.'
  );

  try {
    return JSON.parse(response);
  } catch {
    return { sentiment: 'neutro', suggestions: [] };
  }
}

// Treinar conhecimento do agente
export async function trainAgentKnowledge(
  _agent: Agent,
  knowledgeItems: Array<{ content: string; name: string }>
): Promise<string> {
  return knowledgeItems
    .map(item => `=== ${item.name} ===\n${item.content}`)
    .join('\n\n---\n\n');
}

// Testar conexão do AI
export async function testAIConnection(): Promise<{
  openRouter: boolean;
  openaiAssistants: boolean;
}> {
  return {
    openRouter: openRouterService.isConfigured(),
    openaiAssistants: openaiAssistantsServiceV2.isInitialized(),
  };
}

// Obter modelos disponíveis
export function getAvailableModels(): Array<{ id: string; name: string; provider: string }> {
  return [
    { id: POPULAR_MODELS.GPT4_TURBO, name: 'GPT-4 Turbo', provider: 'OpenAI' },
    { id: POPULAR_MODELS.GPT4, name: 'GPT-4', provider: 'OpenAI' },
    { id: POPULAR_MODELS.GPT35_TURBO, name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: POPULAR_MODELS.CLAUDE_3_OPUS, name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: POPULAR_MODELS.CLAUDE_3_SONNET, name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: POPULAR_MODELS.CLAUDE_3_HAIKU, name: 'Claude 3 Haiku', provider: 'Anthropic' },
    { id: POPULAR_MODELS.GEMINI_PRO, name: 'Gemini Pro', provider: 'Google' },
    { id: POPULAR_MODELS.LLAMA_3_70B, name: 'Llama 3 70B', provider: 'Meta' },
    { id: POPULAR_MODELS.MISTRAL_LARGE, name: 'Mistral Large', provider: 'Mistral' },
    { id: POPULAR_MODELS.MIXTRAL_8X7B, name: 'Mixtral 8x7B', provider: 'Mistral' },
  ];
}

export default {
  chat: unifiedChat,
  quickChat,
  generateCreativeContent,
  analyzeContent,
  extractDemandFromResponse,
  cleanResponse,
  trainAgentKnowledge,
  testAIConnection,
  getAvailableModels,
};
