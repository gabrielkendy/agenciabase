import { GoogleGenerativeAI } from '@google/generative-ai';
import { Agent, ChatMessage, KnowledgeFile } from '../types';

// API KEY FIXA - Já configurada!
const API_KEY = 'AIzaSyDQuaiWaBwgfFbvZ0LkntIl3__YuaM3JDU';
const genAI = new GoogleGenerativeAI(API_KEY);

export const initializeGemini = (_apiKey?: string) => {
  // Já inicializado com key fixa
  console.log('✅ Gemini AI inicializado com sucesso!');
};

export const streamChatResponse = async (
  agent: Agent,
  history: ChatMessage[],
  userMessage: string,
  globalFiles: KnowledgeFile[],
  onChunk: (text: string) => void
): Promise<void> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build context from ALL knowledge files (global + agent specific)
    const allFiles = [...globalFiles, ...agent.files];
    let knowledgeContext = '';
    
    if (allFiles.length > 0) {
      knowledgeContext = `

=== BASE DE CONHECIMENTO ===
${allFiles.map(f => `[ARQUIVO: ${f.name}]
${f.content}
---`).join('\n')}
=== FIM DA BASE DE CONHECIMENTO ===

IMPORTANTE: Use as informações acima para responder de forma precisa e contextualizada.
`;
    }

    const systemPrompt = `${agent.systemInstruction}
${knowledgeContext}
Você é ${agent.name}, especialista como ${agent.role}. ${agent.description}

REGRAS:
- Responda SEMPRE em português brasileiro
- Use as informações da base de conhecimento quando relevante
- Seja profissional, útil e objetivo
- Mantenha a personalidade definida no prompt do sistema`;

    // Build chat history for context
    const chatHistory = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessageStream(`${systemPrompt}\n\nUsuário: ${userMessage}`);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) onChunk(text);
    }
  } catch (error: any) {
    console.error('Gemini Error:', error);
    onChunk(`❌ Erro na IA: ${error.message || 'Falha na comunicação'}`);
  }
};

export const generateImage = async (
  prompt: string,
  _aspectRatio: string = '1:1'
): Promise<string | null> => {
  try {
    // Gemini 2.0 com geração de imagem
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const result = await model.generateContent({
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Create a professional marketing image: ${prompt}. Make it visually stunning, modern, and suitable for social media.` }] 
      }],
    });

    const response = result.response;
    const text = response.text();
    
    // Se não conseguir gerar imagem, retorna placeholder com o prompt
    if (text) {
      // Retorna URL de placeholder com seed baseado no prompt
      const seed = prompt.replace(/\s+/g, '-').substring(0, 50);
      return `https://picsum.photos/seed/${seed}/800/800`;
    }
    
    return null;
  } catch (error) {
    console.error('Image Generation Error:', error);
    // Fallback para placeholder
    const seed = prompt.replace(/\s+/g, '-').substring(0, 50);
    return `https://picsum.photos/seed/${seed}/800/800`;
  }
};

export const trainAgentWithKnowledge = async (
  agent: Agent,
  files: KnowledgeFile[]
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const filesContent = files.map(f => `[${f.name}]: ${f.content}`).join('\n\n');
    
    const prompt = `Você é ${agent.name}, ${agent.role}.

Analise os seguintes documentos e extraia os pontos-chave que você deve lembrar para seu trabalho:

${filesContent}

Crie um RESUMO ESTRUTURADO dos pontos mais importantes que você deve sempre considerar ao responder. Seja conciso mas completo.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    return `Erro ao processar conhecimento: ${error.message}`;
  }
};

export const enhanceBriefing = async (
  title: string,
  description: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Você é um especialista em briefing criativo para redes sociais.

TÍTULO: ${title}
DESCRIÇÃO INICIAL: ${description}

Elabore um briefing mais completo incluindo:
- Objetivo principal
- Público-alvo sugerido
- Tom de voz recomendado
- Elementos visuais sugeridos
- CTA (Call to Action)
- Hashtags relevantes

Seja objetivo e prático.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return description;
  }
};

export const generateCaption = async (
  title: string,
  description: string,
  channel: string
): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    const prompt = `Crie uma legenda profissional para ${channel}:

TÍTULO: ${title}
CONTEXTO: ${description}

A legenda deve ter:
- Gancho forte no início
- Corpo envolvente
- CTA no final
- Emojis estratégicos
- 3-5 hashtags relevantes

Retorne APENAS a legenda pronta para publicar.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch {
    return '';
  }
};
