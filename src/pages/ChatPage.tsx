import { useState, useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import { DemandStatus, ContentType, SocialChannel, Conversation, TeamMember } from '../types';
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

interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'file';
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  type: 'agent' | 'member';
}

export const ChatPage = () => {
  const { 
    agents, clients, apiConfig, messages, conversations, teamMembers,
    addConversation, updateConversation, deleteConversation,
    addMessage, addDemand, addNotification 
  } = useStore();
  
  // State
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [pendingDemands, setPendingDemands] = useState<ParsedDemand[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [searchHistory, setSearchHistory] = useState('');
  const [selectedProject] = useState<string>('default');
  const [sendToSofiaContent, setSendToSofiaContent] = useState<string | null>(null);
  
  // Attachments
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Mentions
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  
  // Participants modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  
  // Mobile state
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [showAgentsSidebar, setShowAgentsSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // All participants (agents + members)
  const allParticipants: ChatParticipant[] = useMemo(() => {
    const agentParticipants = agents.filter(a => a.is_active).map(a => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar,
      type: 'agent' as const
    }));
    const memberParticipants = teamMembers.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      type: 'member' as const
    }));
    return [...agentParticipants, ...memberParticipants];
  }, [agents, teamMembers]);

  // Filtered mentions
  const filteredMentions = useMemo(() => {
    if (!mentionSearch) return allParticipants;
    return allParticipants.filter(p => 
      p.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );
  }, [allParticipants, mentionSearch]);

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  const selectAllAgents = () => {
    const activeAgentIds = agents.filter(a => a.is_active).map(a => a.id);
    setSelectedAgents(activeAgentIds);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name} é muito grande (máx 50MB)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const type = file.type.startsWith('image/') ? 'image' 
                   : file.type.startsWith('video/') ? 'video' 
                   : 'file';
        
        const attachment: ChatAttachment = {
          id: crypto.randomUUID(),
          type,
          name: file.name,
          url,
          size: file.size,
          mimeType: file.type,
        };
        
        setAttachments(prev => [...prev, attachment]);
        toast.success(`${file.name} anexado!`);
      };
      reader.readAsDataURL(file);
    }
    
    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Handle input change with mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Detect @ mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setShowMentions(true);
      
      // Calculate position
      const rect = e.target.getBoundingClientRect();
      setMentionPosition({
        top: rect.top - 200,
        left: rect.left + 20,
      });
    } else {
      setShowMentions(false);
      setMentionSearch('');
    }
  };

  // Insert mention
  const insertMention = (participant: ChatParticipant) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    const newText = textBeforeCursor.slice(0, atIndex) + `@${participant.name} ` + textAfterCursor;
    setInput(newText);
    setShowMentions(false);
    setMentionSearch('');
    
    // Auto-add to participants if member
    if (participant.type === 'member' && !selectedMembers.includes(participant.id)) {
      setSelectedMembers(prev => [...prev, participant.id]);
    }
    
    inputRef.current?.focus();
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
      is_team_chat: selectedAgents.length > 1 || selectedMembers.length > 0,
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

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      const systemPrompt = `${sofiaAgent.system_prompt}

IMPORTANTE: Analise o conteúdo e extraia uma demanda estruturada.
Responda APENAS com um JSON válido no formato:
{
  "title": "Título curto da demanda",
  "briefing": "Descrição detalhada",
  "caption": "Texto para publicação (se aplicável)",
  "hashtags": "#hashtags #relevantes",
  "content_type": "post|stories|reels|video|carousel|article",
  "channels": ["instagram", "facebook", "linkedin", "twitter", "tiktok", "youtube"],
  "tags": ["tag1", "tag2"],
  "scheduled_date": "YYYY-MM-DD (opcional)"
}`;

      let response = '';
      const provider = sofiaAgent.provider || 'gemini';

      if (provider === 'openrouter' && apiConfig.openrouter_key) {
        openrouterService.setApiKey(apiConfig.openrouter_key);
        response = await openrouterService.chat(
          sofiaAgent.model || 'google/gemma-2-9b-it:free',
          [{ role: 'system', content: systemPrompt }, { role: 'user', content }],
          { temperature: 0.3 }
        );
      } else if (apiConfig.gemini_key) {
        response = await sendMessageToGemini(content, systemPrompt, apiConfig.gemini_key);
      } else {
        throw new Error('Configure uma API Key nas configurações');
      }

      // Parse response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as ParsedDemand;
          setPendingDemands([parsed]);
          
          addMessage({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: `📋 **Demanda identificada:**\n\n**${parsed.title}**\n\n${parsed.briefing}\n\n${parsed.caption ? `📝 Caption: ${parsed.caption}\n\n` : ''}${parsed.hashtags ? `#️⃣ ${parsed.hashtags}\n\n` : ''}📱 Canais: ${parsed.channels.join(', ')}\n🏷️ Tags: ${parsed.tags.join(', ')}\n\n_Clique em "Criar no Kanban" para adicionar esta demanda._`,
          });
        } else {
          throw new Error('Resposta não contém JSON válido');
        }
      } catch (parseError) {
        addMessage({
          conversation_id: currentConversationId,
          role: 'assistant',
          content: response,
        });
      }
    } catch (error: any) {
      addMessage({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: `❌ Erro: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDemandFromParsed = (demand: ParsedDemand) => {
    if (!selectedClient) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    const demandId = addDemand({
      client_id: selectedClient,
      title: demand.title,
      briefing: demand.briefing,
      caption: demand.caption,
      hashtags: demand.hashtags,
      content_type: demand.content_type,
      channels: demand.channels,
      tags: demand.tags,
      scheduled_date: demand.scheduled_date,
      status: 'backlog' as DemandStatus,
      created_by: '1',
    });

    addNotification({
      user_id: '1',
      type: 'demand_created',
      title: 'Demanda criada',
      message: `A demanda "${demand.title}" foi criada com sucesso!`,
      data: { demand_id: demandId },
    });

    toast.success('Demanda criada no Kanban!');
    setPendingDemands([]);
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || !currentConversationId || selectedAgents.length === 0) return;

    // Build message content with attachments
    let messageContent = input.trim();
    if (attachments.length > 0) {
      const attachmentText = attachments.map(a => {
        if (a.type === 'image') return `[📷 Imagem: ${a.name}]`;
        if (a.type === 'video') return `[🎬 Vídeo: ${a.name}]`;
        return `[📎 Arquivo: ${a.name}]`;
      }).join('\n');
      messageContent = attachmentText + (messageContent ? '\n\n' + messageContent : '');
    }

    // Add user message with attachments
    addMessage({ 
      conversation_id: currentConversationId, 
      role: 'user', 
      content: messageContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Update conversation title
    if (currentMessages.length === 0) {
      updateConversation(currentConversationId, { 
        title: input.slice(0, 50) || 'Conversa com anexos',
        updated_at: new Date().toISOString() 
      });
    }

    const userMessage = input;
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    // Check if Sofia is selected for demand creation
    if (sofiaAgent && selectedAgents.includes(sofiaAgent.id) && selectedAgents.length === 1) {
      await handleSofiaResponse(userMessage);
      return;
    }

    // Regular chat with selected agents
    try {
      for (const agentId of selectedAgents) {
        const agent = agents.find((a) => a.id === agentId);
        if (!agent) continue;

        const provider = agent.provider || 'gemini';
        let response = '';

        // Build context with attachments
        let contextMessage = userMessage;
        if (attachments.length > 0) {
          contextMessage = `[O usuário enviou ${attachments.length} anexo(s): ${attachments.map(a => `${a.type}: ${a.name}`).join(', ')}]\n\n${userMessage}`;
        }

        if (provider === 'openrouter' && apiConfig.openrouter_key) {
          openrouterService.setApiKey(apiConfig.openrouter_key);
          response = await openrouterService.chat(
            agent.model || 'google/gemma-2-9b-it:free',
            [
              { role: 'system', content: agent.system_prompt },
              ...currentMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
              { role: 'user', content: contextMessage },
            ],
            { temperature: agent.temperature || 0.7 }
          );
        } else if (provider === 'openai' && apiConfig.openai_key) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiConfig.openai_key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: agent.model || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: agent.system_prompt },
                ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
                { role: 'user', content: contextMessage },
              ],
              temperature: agent.temperature || 0.7,
            }),
          });
          const data = await res.json();
          response = data.choices?.[0]?.message?.content || 'Sem resposta';
        } else if (apiConfig.gemini_key) {
          response = await sendMessageToGemini(contextMessage, agent.system_prompt, apiConfig.gemini_key);
        } else {
          throw new Error('Configure uma API Key nas configurações');
        }

        addMessage({ 
          conversation_id: currentConversationId, 
          role: 'assistant', 
          content: selectedAgents.length > 1 ? `**${agent.name}:**\n${response}` : response 
        });
      }

      updateConversation(currentConversationId, { updated_at: new Date().toISOString() });
    } catch (error: any) {
      addMessage({ 
        conversation_id: currentConversationId, 
        role: 'assistant', 
        content: `❌ Erro: ${error.message}` 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected participants info
  const getParticipantsInfo = () => {
    const agentNames = selectedAgents.map(id => agents.find(a => a.id === id)?.name).filter(Boolean);
    const memberNames = selectedMembers.map(id => teamMembers.find(m => m.id === id)?.name).filter(Boolean);
    return [...agentNames, ...memberNames];
  };


  return (
    <div className="h-full bg-gray-950 flex overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Mobile overlay */}
      {(showHistorySidebar || showAgentsSidebar) && isMobile && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowHistorySidebar(false); setShowAgentsSidebar(false); }} />
      )}

      {/* Sidebar - Histórico */}
      <div className={clsx(
        'bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 z-50',
        isMobile ? (showHistorySidebar ? 'fixed inset-y-0 left-0 w-80' : 'hidden') : 'w-80'
      )}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Icons.MessageSquare size={18} className="text-orange-400" />
            Conversas
          </h2>
        </div>
        
        <div className="p-3">
          <div className="relative mb-3">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          
          <button
            onClick={() => { setCurrentConversationId(null); setShowHistorySidebar(false); }}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition"
          >
            <Icons.Plus size={18} />
            Nova Conversa
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projectConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Icons.MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            projectConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={clsx(
                  'w-full p-3 rounded-xl text-left transition group',
                  currentConversationId === conv.id
                    ? 'bg-orange-500/20 border border-orange-500'
                    : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {conv.agent_ids.slice(0, 3).map((id) => {
                      const agent = agents.find((a) => a.id === id);
                      return agent ? (
                        <span key={id} className="text-lg">{agent.avatar}</span>
                      ) : null;
                    })}
                  </div>
                  <p className="text-sm font-medium text-white truncate flex-1">{conv.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(conv.updated_at || conv.created_at).toLocaleDateString('pt-BR')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          {isMobile && (
            <button onClick={() => setShowHistorySidebar(true)} className="p-2 text-gray-400 hover:text-white">
              <Icons.Menu size={20} />
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {selectedAgents.slice(0, 4).map((id) => {
                const agent = agents.find((a) => a.id === id);
                return agent ? (
                  <span key={id} className="text-2xl" title={agent.name}>{agent.avatar}</span>
                ) : null;
              })}
              {selectedMembers.slice(0, 2).map((id) => {
                const member = teamMembers.find((m) => m.id === id);
                return member ? (
                  <div key={id} className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold" title={member.name}>
                    {member.name.charAt(0)}
                  </div>
                ) : null;
              })}
            </div>
            <div>
              <p className="text-white font-medium text-sm">
                {selectedAgents.length > 0 ? `${selectedAgents.length} agentes` : 'Selecione agentes'}
                {selectedMembers.length > 0 && ` + ${selectedMembers.length} membros`}
              </p>
              <p className="text-xs text-gray-500">
                {getParticipantsInfo().slice(0, 3).join(', ')}
                {getParticipantsInfo().length > 3 && ` +${getParticipantsInfo().length - 3}`}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Invite participants button */}
          <button
            onClick={() => setShowParticipantsModal(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
            title="Convidar participantes"
          >
            <Icons.UserPlus size={20} />
          </button>

          {/* Client selector for demands */}
          {sofiaAgent && selectedAgents.includes(sofiaAgent.id) && (
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="">Selecione cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {isMobile && (
            <button onClick={() => setShowAgentsSidebar(true)} className="p-2 text-gray-400 hover:text-white">
              <Icons.Users size={20} />
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!currentConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">💬</div>
                <h2 className="text-2xl font-bold text-white mb-2">Chat com Agentes IA</h2>
                <p className="text-gray-400 mb-6">
                  Selecione agentes e membros da equipe, depois inicie uma conversa.
                  Use @ para mencionar participantes.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">📷 Envie fotos</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">🎬 Envie vídeos</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">📎 Envie arquivos</span>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">@ Mencione pessoas</span>
                </div>
                {selectedAgents.length > 0 && (
                  <button
                    onClick={startNewConversation}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium"
                  >
                    Iniciar Conversa
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {currentMessages.map((msg, idx) => (
                <div key={idx} className={clsx('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">
                      🤖
                    </div>
                  )}
                  <div className={clsx(
                    'max-w-[75%] rounded-2xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-200'
                  )}>
                    {/* Attachments preview */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att: ChatAttachment) => (
                          <div key={att.id} className="relative">
                            {att.type === 'image' ? (
                              <img src={att.url} alt={att.name} className="max-w-[200px] max-h-[150px] rounded-lg object-cover" />
                            ) : att.type === 'video' ? (
                              <video src={att.url} className="max-w-[200px] max-h-[150px] rounded-lg" controls />
                            ) : (
                              <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-2">
                                <Icons.File size={20} className="text-blue-400" />
                                <span className="text-xs truncate max-w-[150px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      EU
                    </div>
                  )}
                </div>
              ))}

              {/* Pending demands */}
              {pendingDemands.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <h4 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                    <Icons.CheckCircle size={18} />
                    Demanda pronta para criar
                  </h4>
                  {pendingDemands.map((demand, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{demand.title}</p>
                        <p className="text-gray-400 text-sm">{demand.channels.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => createDemandFromParsed(demand)}
                        disabled={!selectedClient}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
                      >
                        <Icons.Plus size={16} />
                        Criar no Kanban
                      </button>
                    </div>
                  ))}
                  {!selectedClient && (
                    <p className="text-yellow-400 text-xs mt-2">⚠️ Selecione um cliente no topo</p>
                  )}
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Icons.Loader size={20} className="animate-spin text-white" />
                  </div>
                  <div className="bg-gray-800 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-gray-900 border-t border-gray-800">
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div key={att.id} className="relative group">
                  {att.type === 'image' ? (
                    <img src={att.url} alt={att.name} className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                  ) : att.type === 'video' ? (
                    <div className="w-16 h-16 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                      <Icons.Video size={24} className="text-blue-400" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center">
                      <Icons.File size={24} className="text-gray-400" />
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Icons.X size={12} className="text-white" />
                  </button>
                  <p className="text-[10px] text-gray-500 truncate w-16 mt-1">{att.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        {currentConversationId && (
          <div className="p-4 bg-gray-900 border-t border-gray-800">
            {/* Mentions dropdown */}
            {showMentions && filteredMentions.length > 0 && (
              <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-auto md:w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50">
                {filteredMentions.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => insertMention(p)}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-700 transition text-left"
                  >
                    {p.type === 'agent' ? (
                      <span className="text-xl">{p.avatar}</span>
                    ) : (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {p.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.type === 'agent' ? 'Agente IA' : 'Membro'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Upload buttons */}
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'image/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className="p-2.5 text-gray-400 hover:text-orange-400 hover:bg-gray-800 rounded-lg transition"
                  title="Enviar foto"
                >
                  <Icons.Image size={20} />
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = 'video/*';
                      fileInputRef.current.click();
                    }
                  }}
                  className="p-2.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition"
                  title="Enviar vídeo"
                >
                  <Icons.Video size={20} />
                </button>
                <button
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                      fileInputRef.current.click();
                    }
                  }}
                  className="p-2.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg transition"
                  title="Enviar arquivo"
                >
                  <Icons.Paperclip size={20} />
                </button>
              </div>

              {/* Text input */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem... Use @ para mencionar"
                  rows={1}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className="p-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-white rounded-xl transition"
              >
                {isLoading ? <Icons.Loader size={20} className="animate-spin" /> : <Icons.Send size={20} />}
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-2 text-center">
              💡 Dica: Use @ para mencionar • Shift+Enter para nova linha • Arraste arquivos para anexar
            </p>
          </div>
        )}
      </div>

      {/* Sidebar - Agentes */}
      <div className={clsx(
        'bg-gray-900 border-l border-gray-800 flex flex-col transition-all duration-300 z-50',
        isMobile ? (showAgentsSidebar ? 'fixed inset-y-0 right-0 w-72' : 'hidden') : 'w-72'
      )}>
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white">Agentes</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.filter(a => a.is_active).map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={clsx(
                'w-full p-3 rounded-xl flex items-center gap-3 transition border',
                selectedAgents.includes(agent.id)
                  ? 'bg-orange-500/20 border-orange-500'
                  : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
              )}
            >
              <span className="text-2xl">{agent.avatar}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                <p className="text-xs text-gray-500 truncate">{agent.role}</p>
              </div>
              {selectedAgents.includes(agent.id) && (
                <Icons.Check size={18} className="text-orange-400 flex-shrink-0" />
              )}
            </button>
          ))}

          {/* Team Members section */}
          {teamMembers.length > 0 && (
            <>
              <div className="border-t border-gray-700 my-3 pt-3">
                <p className="text-xs text-gray-500 mb-2 px-1">EQUIPE</p>
              </div>
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => toggleMember(member.id)}
                  className={clsx(
                    'w-full p-3 rounded-xl flex items-center gap-3 transition border',
                    selectedMembers.includes(member.id)
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  )}
                >
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.role}</p>
                  </div>
                  {selectedMembers.includes(member.id) && (
                    <Icons.Check size={18} className="text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <button
            onClick={selectAllAgents}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
          >
            Selecionar Todos
          </button>
          <button
            onClick={startNewConversation}
            disabled={selectedAgents.length === 0}
            className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white rounded-xl font-medium"
          >
            Iniciar Conversa
          </button>
        </div>
      </div>

      {/* Modal - Convidar Participantes */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.UserPlus size={20} className="text-orange-400" />
                Convidar Participantes
              </h2>
              <button onClick={() => setShowParticipantsModal(false)} className="p-2 text-gray-400 hover:text-white">
                <Icons.X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <p className="text-sm text-gray-400 mb-4">
                Adicione agentes IA e membros da equipe à conversa
              </p>

              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">AGENTES IA</p>
                {agents.filter(a => a.is_active).map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={clsx(
                      'w-full p-3 rounded-lg flex items-center gap-3 transition border',
                      selectedAgents.includes(agent.id)
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <span className="text-xl">{agent.avatar}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.role}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedAgents.includes(agent.id)}
                      onChange={() => {}}
                      className="w-4 h-4 accent-orange-500"
                    />
                  </button>
                ))}

                {teamMembers.length > 0 && (
                  <>
                    <p className="text-xs text-gray-500 font-medium mt-4">MEMBROS DA EQUIPE</p>
                    {teamMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => toggleMember(member.id)}
                        className={clsx(
                          'w-full p-3 rounded-lg flex items-center gap-3 transition border',
                          selectedMembers.includes(member.id)
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-white">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.role}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.id)}
                          onChange={() => {}}
                          className="w-4 h-4 accent-blue-500"
                        />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl font-medium"
              >
                Confirmar ({selectedAgents.length + selectedMembers.length} selecionados)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
