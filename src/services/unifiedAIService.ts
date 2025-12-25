// Unified AI Service - Serviço unificado para múltiplos providers de IA
import { Agent } from '../types';
import openRouterService, { POPULAR_MODELS } from './openrouterService';
import { openaiAssistantsServiceV2 } from './openaiAssistantsServiceV2';
import { sendMessageToGemini } from './geminiService';

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// Chat unificado com agente
export async function unifiedChat(
  agent: Agent,
  message: string,
  apiConfig: { gemini_key?: string; openrouter_key?: string; openai_key?: string },
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  const provider = agent.provider;

  // Gemini direto
  if (provider === 'gemini' && apiConfig.gemini_key) {
    return sendMessageToGemini(
      message,
      agent.system_prompt,
      apiConfig.gemini_key,
      agent.user_id,
      agent.name
    );
  }

  // OpenRouter (múltiplos modelos)
  if (provider === 'openrouter' && apiConfig.openrouter_key) {
    openRouterService.setConfig({ apiKey: apiConfig.openrouter_key });
    
    const messages = [
      { role: 'system' as const, content: agent.system_prompt },
      ...history.map(h => ({
        role: h.role as 'user' | 'assistant',
        content: h.content
      })),
      { role: 'user' as const, content: message }
    ];

    const response = await openRouterService.chat({
      model: agent.model,
      messages,
      temperature: agent.temperature
    });

    return response.choices[0]?.message?.content || '';
  }

  // OpenAI Assistants
  if (provider === 'openai' && apiConfig.openai_key) {
    if (agent.openai_assistant_id) {
      openaiAssistantsServiceV2.initialize(apiConfig.openai_key);
      const response = await openaiAssistantsServiceV2.chat(
        agent.openai_assistant_id,
        message
      );
      return response;
    }
  }

  throw new Error(`Provider ${provider} não configurado ou API key ausente`);
}

// Extrair demanda da resposta do AI
export function extractDemandFromResponse(
  response: string,
  clients: Array<{ id: string; name: string }>
): { shouldCreateDemand: boolean; demand?: any } {
  const demandMatch = response.match(/\[DEMAND_JSON\]([\s\S]*?)\[\/DEMAND_JSON\]/);
  if (!demandMatch) return { shouldCreateDemand: false };

  try {
    const data = JSON.parse(demandMatch[1].trim());
    
    // Encontrar cliente pelo nome
    let clientId = data.client_id;
    if (!clientId && data.client_name) {
      const found = clients.find(c => 
        c.name.toLowerCase().includes(data.client_name.toLowerCase())
      );
      if (found) clientId = found.id;
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

// Gerar conteúdo criativo
export async function generateCreativeContent(
  prompt: string,
  type: 'post' | 'caption' | 'hashtags' | 'script' | 'email' | 'article'
): Promise<string> {
  const typePrompts: Record<string, string> = {
    post: 'Você é um expert em social media. Crie um post engajador e criativo.',
    caption: 'Você é um copywriter expert. Crie uma legenda cativante com emojis.',
    hashtags: 'Você é um especialista em SEO social. Gere hashtags relevantes.',
    script: 'Você é um roteirista de vídeos curtos. Crie um script dinâmico.',
    email: 'Você é um expert em email marketing. Crie um email persuasivo.',
    article: 'Você é um redator de conteúdo. Crie um artigo informativo.',
  };
  return simpleChat(prompt, typePrompts[type] || typePrompts.post);
}


// Gerar sugestões de conteúdo
export async function generateContentSuggestions(
  topic: string,
  platform: string,
  count: number = 5
): Promise<string[]> {
  const prompt = `Gere ${count} ideias criativas de conteúdo para ${platform} sobre o tema "${topic}". 
  Responda APENAS com uma lista numerada, sem explicações adicionais.`;

  const response = await simpleChat(prompt);
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
  Descrição: ${description}
  
  Responda no formato:
  LEGENDA: [sua legenda]
  HASHTAGS: #hashtag1 #hashtag2 #hashtag3`;

  const response = await simpleChat(prompt);
  const captionMatch = response.match(/LEGENDA:\s*(.+?)(?=HASHTAGS:|$)/s);
  const hashtagsMatch = response.match(/HASHTAGS:\s*(.+)/s);

  return {
    caption: captionMatch?.[1]?.trim() || description,
    hashtags: hashtagsMatch?.[1]?.match(/#\w+/g) || []
  };
}

// Testar conexão com AI
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
    { id: POPULAR_MODELS.GPT35_TURBO, name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { id: POPULAR_MODELS.CLAUDE_3_OPUS, name: 'Claude 3 Opus', provider: 'Anthropic' },
    { id: POPULAR_MODELS.CLAUDE_3_SONNET, name: 'Claude 3 Sonnet', provider: 'Anthropic' },
    { id: POPULAR_MODELS.GEMINI_PRO, name: 'Gemini Pro', provider: 'Google' },
    { id: POPULAR_MODELS.LLAMA_3_70B, name: 'Llama 3 70B', provider: 'Meta' },
    { id: POPULAR_MODELS.MIXTRAL_8X7B, name: 'Mixtral 8x7B', provider: 'Mistral' },
  ];
}

export default {
  chat: unifiedChat,
  simpleChat,
  generateCreativeContent,
  generateContentSuggestions,
  generateCaption,
  extractDemandFromResponse,
  cleanResponse,
  testAIConnection,
  getAvailableModels,
};
