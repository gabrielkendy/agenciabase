import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Agent, Task, KnowledgeFile } from '../types';

// API Key fixa
const GEMINI_API_KEY = 'AIzaSyDQuaiWaBwgfFbvZ0LkntIl3__YuaM3JDU';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Função para construir contexto com conhecimento
function buildContext(agent: Agent, globalFiles: KnowledgeFile[]): string {
  let context = agent.systemInstruction + '\n\n';
  
  // Adicionar conhecimento do agente
  if (agent.knowledgeFiles && agent.knowledgeFiles.length > 0) {
    context += '=== BASE DE CONHECIMENTO DO AGENTE ===\n';
    agent.knowledgeFiles.forEach(file => {
      context += `\n[${file.name}]:\n${file.content}\n`;
    });
  }
  
  // Adicionar conhecimento global
  if (globalFiles && globalFiles.length > 0) {
    context += '\n=== CONHECIMENTO GLOBAL DA AGÊNCIA ===\n';
    globalFiles.forEach(file => {
      context += `\n[${file.name}]:\n${file.content}\n`;
    });
  }
  
  return context;
}

// Chat com streaming
export async function streamChatResponse(
  agent: Agent,
  history: { role: string; text: string }[],
  userMessage: string,
  globalFiles: KnowledgeFile[],
  onChunk: (text: string) => void
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: agent.model || 'gemini-2.0-flash' });
  
  const systemContext = buildContext(agent, globalFiles);
  
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: `CONTEXTO DO SISTEMA:\n${systemContext}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar seguindo estas diretrizes.' }] },
      ...history.map(msg => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.text }]
      }))
    ],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.7,
    }
  });

  const result = await chat.sendMessageStream(userMessage);
  let fullResponse = '';
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullResponse += text;
    onChunk(text);
  }
  
  return fullResponse;
}

// ==================== IA CRIA TAREFA AUTOMATICAMENTE ====================
interface TaskCreationResult {
  shouldCreateTask: boolean;
  task?: Partial<Task>;
  response: string;
}

export async function analyzeAndCreateTask(
  userMessage: string,
  clientId: string,
  globalFiles: KnowledgeFile[]
): Promise<TaskCreationResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Você é Sofia, Gestora de Projetos da BASE Agency.
Analise a mensagem do usuário e determine se é uma DEMANDA DE CONTEÚDO que deve virar uma tarefa no Kanban.

REGRAS:
1. Se for uma demanda de conteúdo (criar post, carrossel, reels, stories, etc), retorne JSON com a tarefa
2. Se for uma pergunta ou conversa normal, responda normalmente SEM criar tarefa
3. Extraia: título, descrição, prioridade (low/medium/high/urgent), canal (instagram/facebook/tiktok/youtube/linkedin/twitter), tipo de conteúdo

MENSAGEM DO USUÁRIO:
"${userMessage}"

RESPONDA APENAS EM JSON VÁLIDO:
{
  "isTask": true/false,
  "task": {
    "title": "Título curto da demanda",
    "description": "Descrição detalhada",
    "priority": "medium",
    "channel": "instagram",
    "contentType": "carousel/post/reels/stories/video"
  },
  "response": "Sua resposta para o usuário (confirme a criação ou responda a pergunta)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.isTask && parsed.task) {
        const task: Partial<Task> = {
          id: `task-${Date.now()}`,
          clientId: clientId,
          title: parsed.task.title,
          description: parsed.task.description,
          priority: parsed.task.priority || 'medium',
          channel: parsed.task.channel || 'instagram',
          status: 'backlog',
          mediaUrls: [],
          approvalToken: `approval-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          approvalStatus: 'pending',
          createdAt: new Date().toISOString()
        };
        
        return {
          shouldCreateTask: true,
          task,
          response: parsed.response || `✅ Demanda criada: "${task.title}"\n\nAdicionei no Kanban como Backlog. Você pode acompanhar no Workflow!`
        };
      }
      
      return {
        shouldCreateTask: false,
        response: parsed.response || text
      };
    }
    
    return {
      shouldCreateTask: false,
      response: text
    };
  } catch (error) {
    console.error('Erro ao analisar mensagem:', error);
    return {
      shouldCreateTask: false,
      response: 'Desculpe, tive um problema ao processar sua mensagem. Pode repetir?'
    };
  }
}

// ==================== GERAÇÃO DE IMAGEM ====================
export async function generateImagePrompt(description: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Crie um prompt detalhado em INGLÊS para geração de imagem com IA baseado nesta descrição:
"${description}"

O prompt deve ser otimizado para ferramentas como DALL-E, Midjourney ou Stable Diffusion.
Inclua: estilo visual, cores, composição, iluminação, mood.
Responda APENAS com o prompt, sem explicações.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateImage(prompt: string): Promise<string> {
  const seed = Math.random().toString(36).substr(2, 9);
  return `https://picsum.photos/seed/${seed}/800/800`;
}

export async function analyzeContent(content: string, type: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Analise este conteúdo de ${type} e dê feedback profissional:

"${content}"

Avalie:
1. Clareza da mensagem
2. Engajamento potencial
3. Call-to-action
4. Sugestões de melhoria

Seja direto e construtivo.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function generateCaption(
  topic: string, 
  channel: string, 
  tone: string = 'profissional'
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  
  const prompt = `Crie uma legenda para ${channel} sobre "${topic}".
Tom: ${tone}

Inclua:
- Gancho forte na primeira linha
- Conteúdo de valor
- Call-to-action
- Hashtags relevantes (5-10)
- Emojis estratégicos

Formato otimizado para ${channel}.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
