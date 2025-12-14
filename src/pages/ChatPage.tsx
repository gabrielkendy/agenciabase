import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { streamChatResponse } from '../services/geminiService';
import { ChatMessage, AgentRole } from '../types';

export const ChatPage: React.FC = () => {
  const { agents, activeAgentId, setActiveAgentId, globalFiles } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const TEAM_AGENT_ID = 'team-general';
  const isTeamMode = activeAgentId === TEAM_AGENT_ID;
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Detect mentions like @Sofia, @Lucas
    const mentionMatch = input.match(/@(\w+)/);
    let targetAgent = activeAgent;
    
    if (mentionMatch) {
      const mentionedName = mentionMatch[1].toLowerCase();
      const foundAgent = agents.find(a => a.name.toLowerCase().includes(mentionedName));
      if (foundAgent) targetAgent = foundAgent;
    } else if (isTeamMode) {
      // Default to Manager in team mode
      const manager = agents.find(a => a.role === AgentRole.MANAGER);
      if (manager) targetAgent = manager;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const tempId = (Date.now() + 1).toString();
    const modelMessage: ChatMessage = {
      id: tempId,
      role: 'model',
      text: '',
      timestamp: new Date(),
      senderName: targetAgent.name,
      senderAvatar: targetAgent.avatar,
      isThinking: true,
    };

    setMessages(prev => [...prev, modelMessage]);

    let accumulatedText = '';

    try {
      await streamChatResponse(
        targetAgent,
        messages,
        input,
        globalFiles,
        (textChunk) => {
          accumulatedText += textChunk;
          setMessages(prev =>
            prev.map(msg =>
              msg.id === tempId
                ? { ...msg, text: accumulatedText, isThinking: false }
                : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId
            ? { ...msg, text: '❌ Erro ao comunicar com a IA. Tente novamente.', isThinking: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            {isTeamMode ? (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center border-2 border-orange-400">
                <Icons.Users size={20} className="text-white" />
              </div>
            ) : (
              <img src={activeAgent.avatar} alt={activeAgent.name} className="w-10 h-10 rounded-full border-2 border-orange-500" />
            )}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <div>
            <h2 className="font-semibold text-white">{isTeamMode ? 'Time Completo' : activeAgent.name}</h2>
            <p className="text-xs text-gray-400">
              {isTeamMode ? 'Mencione @Nome para falar com especialista' : `${activeAgent.role} • ${activeAgent.files.length} arquivos de conhecimento`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeAgentId}
            onChange={(e) => setActiveAgentId(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
          >
            <option value={TEAM_AGENT_ID}>👥 Time Completo</option>
            <option disabled>──────────</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
            ))}
          </select>
          
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              title="Limpar conversa"
            >
              <Icons.Delete size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            {isTeamMode ? (
              <>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center mb-4 border border-orange-500/30">
                  <Icons.Users size={48} className="text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Canal do Time</h3>
                <p className="text-center max-w-md text-sm">
                  Fale com a <b className="text-orange-400">Gestora Sofia</b> por padrão, ou mencione um especialista:<br/>
                  <span className="text-gray-400">@Lucas (Planejador) • @Clara (Designer) • @Leo (Roteirista)</span>
                </p>
              </>
            ) : (
              <>
                <img src={activeAgent.avatar} className="w-24 h-24 rounded-full mb-4 border-2 border-gray-700" alt="Agent" />
                <h3 className="text-xl font-bold text-white mb-2">{activeAgent.name}</h3>
                <p className="text-sm text-gray-400">{activeAgent.description}</p>
                <p className="text-xs text-orange-400 mt-2">
                  {activeAgent.files.length > 0 ? `✅ Treinado com ${activeAgent.files.length} arquivo(s)` : '📚 Sem conhecimento específico ainda'}
                </p>
              </>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'model' ? (
                  msg.senderAvatar ? (
                    <img src={msg.senderAvatar} className="w-8 h-8 rounded-full border border-orange-500/50" alt="Bot" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-900 flex items-center justify-center text-[10px] border border-orange-700 text-orange-400 font-bold">AI</div>
                  )
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">EU</div>
                )}
              </div>

              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
              }`}>
                {msg.role === 'model' && msg.senderName && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700">
                    <span className="text-xs text-orange-400 font-bold">{msg.senderName}</span>
                    <span className="text-[10px] text-gray-500">•</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">
                  {msg.isThinking && !msg.text ? (
                    <span className="flex items-center gap-2 text-orange-400">
                      <Icons.Loader size={14} className="animate-spin" /> Pensando...
                    </span>
                  ) : msg.text}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 focus-within:border-orange-500 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isTeamMode ? 'Mensagem para o time (use @Nome para direcionar)...' : `Mensagem para ${activeAgent.name}...`}
            className="flex-1 bg-transparent text-white p-2 max-h-32 min-h-[44px] resize-none focus:outline-none"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`p-3 rounded-lg transition-all ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-500/20'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? <Icons.Loader size={20} className="animate-spin" /> : <Icons.Send size={20} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          ✅ Gemini AI conectado • {activeAgent.files.length + globalFiles.length} arquivos de conhecimento disponíveis
        </p>
      </div>
    </div>
  );
};
