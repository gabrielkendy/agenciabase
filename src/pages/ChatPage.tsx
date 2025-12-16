import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { DemandStatus, ContentType, SocialChannel, Conversation } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import { openrouterService } from '../services/openrouterService';
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
  const { 
    agents, clients, apiConfig, messages, conversations, 
    addConversation, updateConversation, deleteConversation,
    addMessage, addDemand, addNotification 
  } = useStore();
  
  // State
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pendingDemands, setPendingDemands] = useState<ParsedDemand[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState('');
  const [selectedProject] = useState<string>('default');
  const [sendToSofiaContent, setSendToSofiaContent] = useState<string | null>(null);
  
  // Mobile state
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [showAgentsSidebar, setShowAgentsSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowHistorySidebar(false);
        setShowAgentsSidebar(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Get current conversation messages
  const currentMessages = messages.filter((m) => m.conversation_id === currentConversationId);
  
  // Get conversations for selected project
  const projectConversations = useMemo(() => {
    return conversations
      .filter(c => !selectedProject || c.project_id === selectedProject || (!c.project_id && selectedProject === 'default'))
      .filter(c => !searchHistory || c.title.toLowerCase().includes(searchHistory.toLowerCase()))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }, [conversations, selectedProject, searchHistory]);

  // Sofia agent
  const sofiaAgent = agents.find((a) => a.name === 'Sofia');

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const selectAllAgents = () => {
    const activeAgentIds = agents.filter(a => a.is_active).map(a => a.id);
    setSelectedAgents(activeAgentIds);
  };

  const startNewConversation = () => {
    if (selectedAgents.length === 0) {
      toast.error('Selecione pelo menos um agente');
      return;
    }
    const id = addConversation({
      user_id: '1',
      project_id: selectedProject,
      title: 'Nova conversa',
      agent_ids: selectedAgents,
      is_team_chat: selectedAgents.length > 1,
      updated_at: new Date().toISOString(),
    });
    setCurrentConversationId(id);
    setShowAgentsSidebar(false);
    setShowHistorySidebar(false);
    toast.success('Conversa iniciada!');
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setSelectedAgents(conv.agent_ids);
    setShowHistorySidebar(false);
  };

  // Send message to Sofia with content
  const handleSendToSofia = (content: string) => {
    if (!sofiaAgent) {
      toast.error('Agente Sofia não encontrado');
      return;
    }
    
    setSelectedAgents([sofiaAgent.id]);
    const id = addConversation({
      user_id: '1',
      project_id: selectedProject,
      title: 'Criar demanda',
      agent_ids: [sofiaAgent.id],
      is_team_chat: false,
      updated_at: new Date().toISOString(),
    });
    setCurrentConversationId(id);
    setSendToSofiaContent(content);
    toast.success('Enviado para Sofia!');
  };

  useEffect(() => {
    if (sendToSofiaContent && currentConversationId && sofiaAgent) {
      const content = sendToSofiaContent;
      setSendToSofiaContent(null);
      addMessage({ 
        conversation_id: currentConversationId, 
        role: 'user', 
        content: `Crie uma demanda no Kanban com base neste conteúdo:\n\n${content}` 
      });
      setTimeout(() => {
        setInput('');
        handleSofiaResponse(content);
      }, 100);
    }
  }, [sendToSofiaContent, currentConversationId]);

  const handleSofiaResponse = async (content: string) => {
    if (!sofiaAgent || !currentConversationId) return;
    
    setIsLoading(true);
    try {
      const systemPrompt = sofiaAgent.system_prompt + `\n\nRetorne JSON estruturado:
\`\`\`json
{"title": "Título", "briefing": "Descrição", "caption": "Legenda", "hashtags": "#tags", "content_type": "post", "channels": ["instagram"], "tags": [], "scheduled_date": ""}
\`\`\``;

      let response: string;
      if (sofiaAgent.provider === 'openrouter' && apiConfig.openrouter_key) {
        openrouterService.setApiKey(apiConfig.openrouter_key);
        response = await openrouterService.chat(sofiaAgent.model, [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crie uma demanda:\n\n${content}` }
        ], { temperature: sofiaAgent.temperature });
      } else {
        response = await sendMessageToGemini(`Crie uma demanda:\n\n${content}`, systemPrompt, apiConfig.gemini_key || '');
      }
      
      addMessage({ conversation_id: currentConversationId, agent_id: sofiaAgent.id, role: 'assistant', content: response });
      const parsed = parseDemands(response);
      if (parsed.length > 0) setPendingDemands(parsed);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao processar');
    } finally {
      setIsLoading(false);
    }
  };

  const parseDemands = (text: string): ParsedDemand[] => {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed)) {
          return parsed.map((d: any) => ({
            title: d.title || 'Nova Demanda',
            briefing: d.briefing || '',
            caption: d.caption || '',
            hashtags: d.hashtags || '',
            content_type: (d.content_type || 'post') as ContentType,
            channels: (d.channels || ['instagram']) as SocialChannel[],
            tags: d.tags || [],
            scheduled_date: d.scheduled_date || '',
          }));
        } else if (parsed.title) {
          return [{ ...parsed, content_type: parsed.content_type || 'post', channels: parsed.channels || ['instagram'], tags: parsed.tags || [] }];
        }
      } catch (e) { console.error('Parse error:', e); }
    }
    return [];
  };

  const createDemandsInKanban = () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente');
      return;
    }
    pendingDemands.forEach((demand) => {
      addDemand({
        user_id: '1', client_id: selectedClient, title: demand.title, briefing: demand.briefing,
        caption: demand.caption, hashtags: demand.hashtags, status: 'rascunho' as DemandStatus,
        content_type: demand.content_type, channels: demand.channels, media: [], tags: demand.tags,
        scheduled_date: demand.scheduled_date, internal_approvers: [], external_approvers: [],
        skip_internal_approval: false, skip_external_approval: false, approval_status: 'pending',
        approval_link_sent: false, auto_schedule: false, created_by_ai: true, is_draft: false, comments: [],
      });
    });
    addNotification({ title: 'Demandas criadas!', message: `${pendingDemands.length} demanda(s) no Kanban`, type: 'success', read: false });
    toast.success(`${pendingDemands.length} demanda(s) criada(s)!`);
    setPendingDemands([]);
    setSelectedClient('');
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentConversationId) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ conversation_id: currentConversationId, role: 'user', content: userMessage });
    
    if (currentMessages.length === 0) {
      updateConversation(currentConversationId, { 
        title: userMessage.substring(0, 40) + (userMessage.length > 40 ? '...' : ''),
        updated_at: new Date().toISOString()
      });
    } else {
      updateConversation(currentConversationId, { updated_at: new Date().toISOString() });
    }
    
    setIsLoading(true);

    try {
      for (const agentId of selectedAgents) {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) continue;

        let systemPrompt = agent.system_prompt;
        if (agent.name === 'Sofia') {
          systemPrompt += `\n\nRetorne JSON quando criar demandas. Clientes: ${clients.map((c) => c.name).join(', ')}.`;
        }

        let response: string;
        
        if (agent.provider === 'openrouter' && apiConfig.openrouter_key) {
          openrouterService.setApiKey(apiConfig.openrouter_key);
          response = await openrouterService.chat(agent.model, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ], { temperature: agent.temperature });
        } else if (agent.provider === 'openai' && apiConfig.openai_key) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiConfig.openai_key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: agent.model,
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
              temperature: agent.temperature,
            }),
          });
          const data = await res.json();
          response = data.choices?.[0]?.message?.content || 'Sem resposta';
        } else if (apiConfig.gemini_key) {
          response = await sendMessageToGemini(userMessage, systemPrompt, apiConfig.gemini_key);
        } else {
          throw new Error('Nenhuma API configurada');
        }
        
        addMessage({ conversation_id: currentConversationId, agent_id: agentId, role: 'assistant', content: response });

        if (agent.name === 'Sofia') {
          const parsed = parseDemands(response);
          if (parsed.length > 0) setPendingDemands(parsed);
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao enviar mensagem');
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

  const deleteConv = (id: string) => {
    deleteConversation(id);
    if (currentConversationId === id) setCurrentConversationId(null);
    toast.success('Conversa excluída');
  };

  // Mobile: Render sidebars as overlays
  const HistorySidebar = () => (
    <div className={clsx(
      'bg-gray-900 border-r border-gray-800 flex flex-col h-full',
      isMobile ? 'w-full' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <span className="font-semibold text-white">Conversas</span>
        {isMobile && (
          <button onClick={() => setShowHistorySidebar(false)} className="p-2 text-gray-400 hover:text-white">
            <Icons.X size={20} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchHistory}
            onChange={(e) => setSearchHistory(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {/* New Conversation */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => { setCurrentConversationId(null); setSelectedAgents([]); setShowHistorySidebar(false); }}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-medium transition flex items-center justify-center gap-2"
        >
          <Icons.Plus size={18} /> Nova Conversa
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {projectConversations.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">Nenhuma conversa</p>
        ) : (
          projectConversations.map((conv) => (
            <div
              key={conv.id}
              className={clsx(
                'group px-3 py-2.5 rounded-xl cursor-pointer transition flex items-center gap-2',
                currentConversationId === conv.id ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-800 text-gray-300'
              )}
              onClick={() => selectConversation(conv)}
            >
              <Icons.MessageSquare size={16} className="flex-shrink-0" />
              <span className="flex-1 text-sm truncate">{conv.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConv(conv.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1"
              >
                <Icons.Trash size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const AgentsSidebar = () => (
    <div className={clsx(
      'bg-gray-900 border-l border-gray-800 flex flex-col h-full',
      isMobile ? 'w-full' : 'w-56'
    )}>
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <span className="font-semibold text-white">Agentes</span>
        {isMobile && (
          <button onClick={() => setShowAgentsSidebar(false)} className="p-2 text-gray-400 hover:text-white">
            <Icons.X size={20} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agents.filter((a) => a.is_active).map((agent) => (
          <button
            key={agent.id}
            onClick={() => toggleAgent(agent.id)}
            className={clsx(
              'w-full p-3 rounded-xl border transition-all text-left flex items-center gap-3',
              selectedAgents.includes(agent.id) 
                ? 'border-orange-500 bg-orange-500/10' 
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            )}
          >
            <span className="text-2xl">{agent.avatar}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm">{agent.name}</p>
              <p className="text-xs text-gray-500 truncate">{agent.role}</p>
            </div>
            {selectedAgents.includes(agent.id) && <Icons.Check className="text-orange-500" size={16} />}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-gray-800 space-y-2">
        <button
          onClick={selectAllAgents}
          className="w-full py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition"
        >
          Selecionar Todos
        </button>
        <button
          onClick={startNewConversation}
          disabled={selectedAgents.length === 0}
          className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition"
        >
          Iniciar Conversa
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-full flex bg-gray-950 relative">
      {/* Desktop: Left Sidebar */}
      {!isMobile && <HistorySidebar />}

      {/* Mobile: Left Sidebar Overlay */}
      {isMobile && showHistorySidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHistorySidebar(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-full">
            <HistorySidebar />
          </div>
        </>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gray-900">
            <button
              onClick={() => setShowHistorySidebar(true)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <Icons.Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              {selectedAgents.length > 0 ? (
                <div className="flex -space-x-2">
                  {selectedAgents.slice(0, 2).map((id) => {
                    const agent = agents.find(a => a.id === id);
                    return agent ? (
                      <div key={id} className="w-7 h-7 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-sm">
                        {agent.avatar}
                      </div>
                    ) : null;
                  })}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Chat IA</span>
              )}
            </div>
            <button
              onClick={() => setShowAgentsSidebar(true)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <Icons.Users size={20} />
            </button>
          </div>
        )}

        {!currentConversationId ? (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center p-4 md:p-8">
            <div className="text-center max-w-md w-full">
              <div className="text-5xl md:text-7xl mb-4 md:mb-6">🤖</div>
              <h1 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3">Chat com Agentes IA</h1>
              <p className="text-gray-400 text-sm md:text-base mb-6 md:mb-8">
                Selecione os agentes e inicie uma conversa
              </p>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => { if (sofiaAgent) { setSelectedAgents([sofiaAgent.id]); startNewConversation(); }}}
                  className="p-3 md:p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl hover:bg-orange-500/20 transition text-left"
                >
                  <span className="text-xl md:text-2xl mb-1 md:mb-2 block">📋</span>
                  <p className="font-medium text-white text-sm md:text-base">Criar Demandas</p>
                  <p className="text-xs text-gray-500">Com Sofia</p>
                </button>
                <button
                  onClick={() => { selectAllAgents(); if (!isMobile) startNewConversation(); else setShowAgentsSidebar(true); }}
                  className="p-3 md:p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition text-left"
                >
                  <span className="text-xl md:text-2xl mb-1 md:mb-2 block">👥</span>
                  <p className="font-medium text-white text-sm md:text-base">Todos Agentes</p>
                  <p className="text-xs text-gray-500">Chat em equipe</p>
                </button>
              </div>

              {isMobile ? (
                <button
                  onClick={() => setShowAgentsSidebar(true)}
                  className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-white font-medium transition"
                >
                  Selecionar Agentes
                </button>
              ) : (
                <p className="text-sm text-gray-500">Selecione agentes na barra lateral direita →</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Chat Header */}
            {!isMobile && (
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {selectedAgents.slice(0, 3).map((id) => {
                      const agent = agents.find(a => a.id === id);
                      return agent ? (
                        <div key={id} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-900 flex items-center justify-center text-sm">
                          {agent.avatar}
                        </div>
                      ) : null;
                    })}
                  </div>
                  <span className="font-medium text-white">
                    {selectedAgents.length === 1 
                      ? agents.find(a => a.id === selectedAgents[0])?.name 
                      : `${selectedAgents.length} agentes`}
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3 md:space-y-4">
              {currentMessages.map((msg) => {
                const agent = msg.agent_id ? agents.find((a) => a.id === msg.agent_id) : null;
                return (
                  <div key={msg.id} className={clsx('flex gap-2 md:gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && agent && (
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg md:text-xl flex-shrink-0">
                        {agent.avatar}
                      </div>
                    )}
                    <div className={clsx('max-w-[85%] md:max-w-2xl')}>
                      <div className={clsx(
                        'rounded-2xl p-3 md:p-4',
                        msg.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-100'
                      )}>
                        {msg.role === 'assistant' && agent && (
                          <p className="text-xs text-orange-400 mb-1 font-medium">{agent.name}</p>
                        )}
                        <p className="whitespace-pre-wrap text-sm">
                          {msg.content.replace(/```json[\s\S]*?```/g, '[Demandas detectadas]')}
                        </p>
                      </div>
                      
                      {/* Message Actions */}
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-1 mt-1 ml-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content).then(() => toast.success('Copiado!'))}
                            className="p-1.5 text-gray-500 hover:text-white rounded transition"
                          >
                            <Icons.Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleSendToSofia(msg.content)}
                            className="p-1.5 text-gray-500 hover:text-orange-400 rounded transition flex items-center gap-1"
                          >
                            <Icons.Send size={14} />
                            <span className="text-xs hidden md:inline">Sofia</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {isLoading && (
                <div className="flex gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 flex items-center justify-center">
                    <Icons.Loader className="animate-spin text-orange-500" size={18} />
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-3 md:p-4">
                    <p className="text-sm text-gray-400">Pensando...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending Demands */}
            {pendingDemands.length > 0 && (
              <div className="mx-3 md:mx-6 mb-3 p-3 md:p-4 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl md:rounded-2xl">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg md:text-xl">📋</span>
                    <h4 className="font-semibold text-white text-sm md:text-base">{pendingDemands.length} Demanda(s)</h4>
                  </div>
                  <button onClick={() => setPendingDemands([])} className="text-gray-400 hover:text-white">
                    <Icons.X size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                  <select 
                    value={selectedClient} 
                    onChange={(e) => setSelectedClient(e.target.value)} 
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Selecione cliente...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button 
                    onClick={createDemandsInKanban} 
                    disabled={!selectedClient} 
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition flex items-center justify-center gap-2"
                  >
                    <Icons.Kanban size={16} /> Criar
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 md:p-4 border-t border-gray-800">
              <div className="flex gap-2 md:gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm resize-none focus:border-orange-500 focus:outline-none"
                />
                <button 
                  onClick={sendMessage} 
                  disabled={isLoading || !input.trim()} 
                  className="px-4 md:px-6 py-2.5 md:py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-white font-medium transition"
                >
                  <Icons.Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Desktop: Right Sidebar */}
      {!isMobile && <AgentsSidebar />}

      {/* Mobile: Right Sidebar Overlay */}
      {isMobile && showAgentsSidebar && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAgentsSidebar(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full">
            <AgentsSidebar />
          </div>
        </>
      )}
    </div>
  );
};
