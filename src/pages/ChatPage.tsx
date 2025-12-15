import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { DemandStatus, ContentType, SocialChannel } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ParsedDemand {
  title: string;
  briefing: string;
  caption?: string;
  hashtags?: string;
  content_type: ContentType;
  channels: SocialChannel[];
  tags: string[];
  scheduled_date?: string;
}

export const ChatPage = () => {
  const { agents, clients, apiConfig, messages, addConversation, addMessage, addDemand, addNotification } = useStore();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pendingDemands, setPendingDemands] = useState<ParsedDemand[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const currentMessages = messages.filter((m) => m.conversation_id === currentConversationId);

  // Sofia (gestora de demandas)
  const sofiaAgent = agents.find((a) => a.name === 'Sofia');
  const isSofiaSelected = selectedAgents.includes(sofiaAgent?.id || '');

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const startNewConversation = () => {
    if (selectedAgents.length === 0) {
      toast.error('Selecione pelo menos um agente');
      return;
    }
    const id = addConversation({
      user_id: '1',
      title: 'Nova conversa',
      agent_ids: selectedAgents,
      is_team_chat: selectedAgents.length > 1,
    });
    setCurrentConversationId(id);
    toast.success('Conversa iniciada!');
  };


  // Parse demands from Sofia's response
  const parseDemands = (text: string): ParsedDemand[] => {
    const demands: ParsedDemand[] = [];
    
    // Try to find JSON in the response
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.map((d: any) => ({
            title: d.title || d.titulo || 'Nova Demanda',
            briefing: d.briefing || d.descricao || '',
            caption: d.caption || d.legenda || '',
            hashtags: d.hashtags || '',
            content_type: (d.content_type || d.tipo || 'post') as ContentType,
            channels: (d.channels || d.canais || ['instagram']) as SocialChannel[],
            tags: d.tags || [],
            scheduled_date: d.scheduled_date || d.data || '',
          }));
        } else if (parsed.title || parsed.titulo) {
          return [{
            title: parsed.title || parsed.titulo || 'Nova Demanda',
            briefing: parsed.briefing || parsed.descricao || '',
            caption: parsed.caption || parsed.legenda || '',
            hashtags: parsed.hashtags || '',
            content_type: (parsed.content_type || parsed.tipo || 'post') as ContentType,
            channels: (parsed.channels || parsed.canais || ['instagram']) as SocialChannel[],
            tags: parsed.tags || [],
            scheduled_date: parsed.scheduled_date || parsed.data || '',
          }];
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    }
    return demands;
  };

  // Create demands in Kanban
  const createDemandsInKanban = () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente primeiro');
      return;
    }
    pendingDemands.forEach((demand) => {
      addDemand({
        user_id: '1',
        client_id: selectedClient,
        title: demand.title,
        briefing: demand.briefing,
        caption: demand.caption,
        hashtags: demand.hashtags,
        status: 'rascunho' as DemandStatus,
        content_type: demand.content_type,
        channels: demand.channels,
        media: [],
        tags: demand.tags,
        scheduled_date: demand.scheduled_date,
        internal_approvers: [],
        external_approvers: [],
        approval_status: 'pending',
        auto_schedule: false,
        created_by_ai: true,
      });
    });
    addNotification({
      title: 'Demandas criadas!',
      message: `${pendingDemands.length} demanda(s) adicionada(s) ao Kanban`,
      type: 'success',
      read: false,
    });
    toast.success(`${pendingDemands.length} demanda(s) criada(s) no Kanban!`);
    setPendingDemands([]);
    setSelectedClient('');
  };


  const sendMessage = async () => {
    if (!input.trim() || !currentConversationId) return;
    if (!apiConfig.gemini_key) {
      toast.error('Configure a API Key do Gemini nas configurações');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    addMessage({ conversation_id: currentConversationId, role: 'user', content: userMessage });
    setIsLoading(true);

    try {
      for (const agentId of selectedAgents) {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) continue;

        // Enhanced prompt for Sofia
        let systemPrompt = agent.system_prompt;
        if (agent.name === 'Sofia') {
          systemPrompt += `\n\nQuando o usuário pedir para criar demandas/posts/conteúdos, SEMPRE retorne um JSON estruturado no formato:
\`\`\`json
[
  {
    "title": "Título da demanda",
    "briefing": "Descrição detalhada",
    "caption": "Legenda sugerida para o post",
    "hashtags": "#hashtag1 #hashtag2",
    "content_type": "post|carrossel|reels|stories|video",
    "channels": ["instagram", "facebook"],
    "tags": ["promo", "urgente"],
    "scheduled_date": "2024-12-20"
  }
]
\`\`\`
Depois do JSON, adicione uma explicação amigável sobre as demandas criadas.
Os clientes disponíveis são: ${clients.map((c) => c.name).join(', ')}.`;
        }

        const response = await sendMessageToGemini(userMessage, systemPrompt, apiConfig.gemini_key);
        
        addMessage({ conversation_id: currentConversationId, agent_id: agentId, role: 'assistant', content: response });

        // Check if Sofia returned demands
        if (agent.name === 'Sofia') {
          const parsed = parseDemands(response);
          if (parsed.length > 0) {
            setPendingDemands(parsed);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };


  return (
    <div className="h-full flex">
      {/* Agent Selection Sidebar */}
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white mb-3">Agentes IA</h3>
          <p className="text-xs text-gray-500 mb-3">Selecione os agentes para conversar</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {agents.filter((a) => a.is_active).map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={clsx(
                'w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3',
                selectedAgents.includes(agent.id) ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <span className="text-2xl">{agent.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm">{agent.name}</p>
                <p className="text-xs text-gray-500 truncate">{agent.role}</p>
              </div>
              {selectedAgents.includes(agent.id) && <Icons.Check className="text-orange-500" size={18} />}
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={startNewConversation}
            disabled={selectedAgents.length === 0}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-medium transition flex items-center justify-center gap-2"
          >
            <Icons.MessageSquare size={18} /> Nova Conversa
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {!currentConversationId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl font-bold text-white mb-2">Selecione agentes e inicie uma conversa</h2>
              <p className="text-gray-500 max-w-md">Escolha os especialistas IA para te ajudar com estratégias, textos, análises e muito mais.</p>
              {sofiaAgent && (
                <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl max-w-md mx-auto">
                  <p className="text-sm text-orange-400">💡 Dica: Selecione a <strong>Sofia</strong> para criar demandas diretamente no Kanban!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentMessages.map((msg) => {
                const agent = msg.agent_id ? agents.find((a) => a.id === msg.agent_id) : null;
                return (
                  <div key={msg.id} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && agent && (
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">{agent.avatar}</div>
                    )}
                    <div className={clsx('max-w-2xl rounded-2xl p-4', msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-100')}>
                      {msg.role === 'assistant' && agent && <p className="text-xs text-orange-400 mb-1 font-medium">{agent.name}</p>}
                      <p className="whitespace-pre-wrap text-sm">{msg.content.replace(/```json[\s\S]*?```/g, '[Demandas detectadas - veja abaixo]')}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center"><Icons.Loader className="animate-spin text-orange-500" size={20} /></div>
                  <div className="bg-gray-800 rounded-2xl p-4"><p className="text-sm text-gray-400">Pensando...</p></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>


            {/* Pending Demands Panel */}
            {pendingDemands.length > 0 && (
              <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    <h4 className="font-semibold text-white">{pendingDemands.length} Demanda(s) prontas para o Kanban</h4>
                  </div>
                  <button onClick={() => setPendingDemands([])} className="text-gray-400 hover:text-white"><Icons.Close size={18} /></button>
                </div>
                
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {pendingDemands.map((d, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg">
                      <span className="text-orange-400">#{i + 1}</span>
                      <span className="text-white text-sm flex-1 truncate">{d.title}</span>
                      <span className="text-xs text-gray-500">{d.content_type}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:border-orange-500 focus:outline-none">
                    <option value="">Selecione o cliente...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={createDemandsInKanban} disabled={!selectedClient} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-medium transition flex items-center gap-2">
                    <Icons.Kanban size={18} /> Criar no Kanban
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isSofiaSelected ? 'Ex: Crie 5 posts para a Black Friday sobre promoções...' : 'Digite sua mensagem...'}
                    rows={1}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white resize-none focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-medium transition flex items-center gap-2">
                  <Icons.Send size={18} />
                </button>
              </div>
              {isSofiaSelected && (
                <p className="text-xs text-gray-500 mt-2">💡 Sofia pode criar demandas automaticamente. Tente: "Crie 3 posts sobre lançamento de produto"</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
