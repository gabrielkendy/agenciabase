import type { Agent, Client, AIProvider, Demand } from '../types';

interface ChatCompletionOptions {
  agent: Agent;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onStream?: (chunk: string) => void;
  clients?: Client[];
  apiKeys: { openai?: string; gemini?: string };
}

interface DemandExtractionResult {
  shouldCreateDemand: boolean;
  demand?: Partial<Demand>;
}

const DEMAND_CREATION_PROMPT = `
Você é um assistente de agência de marketing. Quando o usuário solicitar criação de conteúdo, SEMPRE responda no seguinte formato JSON no início da sua resposta (antes de qualquer texto):

Se for solicitação de criação de conteúdo:
[DEMAND_JSON]{"create_demand": true, "title": "título da demanda", "briefing": "descrição", "content_type": "post|carrossel|reels|stories|video", "channels": ["instagram","facebook"], "client_name": "nome do cliente se mencionado"}[/DEMAND_JSON]

Depois do JSON, continue com sua resposta normal criando o conteúdo solicitado.
Se NÃO for solicitação de criação de conteúdo, responda normalmente sem o JSON.
`;

async function callOpenAI(options: ChatCompletionOptions): Promise<string> {
  const { agent, messages, onStream, apiKeys } = options;
  if (!apiKeys.openai) throw new Error('OpenAI API key não configurada');

  const systemMessage = {
    role: 'system' as const,
    content: `${agent.system_prompt}\n\n${agent.trained_knowledge ? `Conhecimento treinado:\n${agent.trained_knowledge}` : ''}\n\n${DEMAND_CREATION_PROMPT}`
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.openai}` },
    body: JSON.stringify({ model: agent.model, messages: [systemMessage, ...messages], temperature: agent.temperature, stream: !!onStream })
  });

  if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || 'Erro na API OpenAI'); }

  if (onStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
      for (const line of lines) {
        const data = line.replace('data: ', '').trim();
        if (data === '[DONE]') continue;
        try { const parsed = JSON.parse(data); const content = parsed.choices?.[0]?.delta?.content || ''; if (content) { fullResponse += content; onStream(content); } } catch {}
      }
    }
    return fullResponse;
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(options: ChatCompletionOptions): Promise<string> {
  const { agent, messages, onStream, apiKeys } = options;
  if (!apiKeys.gemini) throw new Error('Gemini API key não configurada');

  const systemInstruction = `${agent.system_prompt}\n\n${agent.trained_knowledge ? `Conhecimento treinado:\n${agent.trained_knowledge}` : ''}\n\n${DEMAND_CREATION_PROMPT}`;
  const contents = messages.map(msg => ({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${agent.model}:${onStream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKeys.gemini}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system_instruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature: agent.temperature } })
  });

  if (!response.ok) { const error = await response.json(); throw new Error(error.error?.message || 'Erro na API Gemini'); }

  if (onStream && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      try { const lines = chunk.split('\n').filter(l => l.trim()); for (const line of lines) { if (line.includes('"text"')) { const match = line.match(/"text"\s*:\s*"([^"]*)"/); if (match) { const text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'); fullResponse += text; onStream(text); } } } } catch {}
    }
    return fullResponse;
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function chat(options: ChatCompletionOptions): Promise<string> {
  const { agent } = options;
  return agent.provider === 'openai' ? callOpenAI(options) : callGemini(options);
}

export function extractDemandFromResponse(response: string, clients: Client[]): DemandExtractionResult {
  const match = response.match(/\[DEMAND_JSON\](.*?)\[\/DEMAND_JSON\]/s);
  if (!match) return { shouldCreateDemand: false };
  try {
    const data = JSON.parse(match[1]);
    if (!data.create_demand) return { shouldCreateDemand: false };
    let clientId = clients[0]?.id || '';
    if (data.client_name) {
      const found = clients.find(c => c.name.toLowerCase().includes(data.client_name.toLowerCase()) || c.company.toLowerCase().includes(data.client_name.toLowerCase()));
      if (found) clientId = found.id;
    }
    return { shouldCreateDemand: true, demand: { title: data.title || 'Nova demanda', briefing: data.briefing || '', content_type: data.content_type || 'post', channels: data.channels || ['instagram'], client_id: clientId, status: 'rascunho', created_by_ai: true, media: [] } };
  } catch { return { shouldCreateDemand: false }; }
}

export function cleanResponse(response: string): string {
  return response.replace(/\[DEMAND_JSON\].*?\[\/DEMAND_JSON\]/s, '').trim();
}

export async function trainAgentKnowledge(_agent: Agent, knowledgeItems: Array<{ content: string; name: string }>): Promise<string> {
  return knowledgeItems.map(item => `=== ${item.name} ===\n${item.content}`).join('\n\n---\n\n');
}

export async function testAIConnection(provider: AIProvider, apiKey: string): Promise<boolean> {
  try {
    if (provider === 'openai') { const r = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': `Bearer ${apiKey}` } }); return r.ok; }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`); return r.ok;
  } catch { return false; }
}
