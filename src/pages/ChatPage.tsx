import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { chat, extractTaskFromResponse, cleanResponse } from '../services/ai';
import type { ChatMessage, Task } from '../types';
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';

export const ChatPage: React.FC = () => {
  const { agents, clients, apiConfig, selectedClientId, messages, addMessage, updateMessage, addTask, addNotification } = useStore();
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(['agent-sofia']);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAgents = agents.filter(a => selectedAgentIds.includes(a.id) && a.is_active);
  const isTeamChat = selectedAgentIds.length > 1 || selectedAgentIds.includes('team');

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

  const selectAgent = (agentId: string) => {
    if (agentId === 'team') setSelectedAgentIds(['team']);
    else if (selectedAgentIds.includes('team')) setSelectedAgentIds([agentId]);
    else if (selectedAgentIds.includes(agentId)) { if (selectedAgentIds.length > 1) setSelectedAgentIds(selectedAgentIds.filter(id => id !== agentId)); }
    else setSelectedAgentIds([...selectedAgentIds, agentId]);
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage: ChatMessage = { id: uuid(), conversation_id: 'main', role: 'user', content: inputMessage.trim(), created_at: new Date().toISOString() };
    addMessage(userMessage);
    setInputMessage('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      const respondingAgents = isTeamChat ? agents.filter(a => a.is_active).slice(0, 3) : activeAgents;
      for (const agent of respondingAgents) {
        const assistantMessageId = uuid();
        const chatHistory = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
        let contextMessage = '';
        if (selectedClientId) { const client = clients.find(c => c.id === selectedClientId); if (client) contextMessage = `\n[Contexto: Cliente ${client.name} - ${client.company}]`; }
        let fullResponse = '';
        setStreamingContent('');
        const tempMessage: ChatMessage = { id: assistantMessageId, conversation_id: 'main', agent_id: agent.id, role: 'assistant', content: '', created_at: new Date().toISOString() };
        addMessage(tempMessage);
        fullResponse = await chat({ agent, messages: [...chatHistory, { role: 'user', content: userMessage.content + contextMessage }], onStream: (chunk) => { fullResponse += chunk; setStreamingContent(prev => prev + chunk); updateMessage(assistantMessageId, { content: fullResponse }); }, clients, apiKeys: { openai: apiConfig.openai_key, gemini: apiConfig.gemini_key } });
        const taskResult = extractTaskFromResponse(fullResponse, clients);
        if (taskResult.shouldCreateTask && taskResult.task) {
          const newTask: Task = { id: uuid(), user_id: '', client_id: taskResult.task.client_id || selectedClientId || clients[0]?.id || '', title: taskResult.task.title || 'Nova Tarefa', description: taskResult.task.description || '', content: cleanResponse(fullResponse), status: 'todo', priority: taskResult.task.priority || 'medium', content_type: taskResult.task.content_type || 'post', channel: taskResult.task.channel || 'instagram', assigned_agent_id: agent.id, media_urls: [], created_by_ai: true, created_at: new Date().toISOString() };
          addTask(newTask);
          addNotification({ id: uuid(), title: '✨ Tarefa criada pela IA', message: `${agent.name} criou: ${newTask.title}`, type: 'success', read: false, timestamp: new Date().toISOString() });
        }
        updateMessage(assistantMessageId, { content: cleanResponse(fullResponse) });
        setStreamingContent('');
        if (respondingAgents.length > 1) await new Promise(r => setTimeout(r, 500));
      }
    } catch (error: any) { addNotification({ id: uuid(), title: 'Erro', message: error.message, type: 'error', read: false, timestamp: new Date().toISOString() }); }
    finally { setIsLoading(false); setStreamingContent(''); }
  };

  const getAgentById = (id?: string) => agents.find(a => a.id === id);

  return (
    <div className="h-full flex bg-gray-950">
      <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800"><h2 className="text-sm font-bold text-white flex items-center gap-2"><Icons.Agents size={16} className="text-orange-400" />Agentes IA</h2></div>
        <button onClick={() => selectAgent('team')} className={clsx('mx-3 mt-3 p-3 rounded-xl border transition-all text-left', selectedAgentIds.includes('team') ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600')}>
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center"><Icons.Sparkles size={20} className="text-white" /></div><div><p className="font-medium text-white">Time Completo</p><p className="text-xs text-gray-400">Todos colaboram</p></div></div>
        </button>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {agents.filter(a => a.is_active).map(agent => (
            <button key={agent.id} onClick={() => selectAgent(agent.id)} className={clsx('w-full p-3 rounded-xl border transition-all text-left', selectedAgentIds.includes(agent.id) && !selectedAgentIds.includes('team') ? 'bg-orange-500/10 border-orange-500/50' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600')}>
              <div className="flex items-center gap-3"><img src={agent.avatar} className="w-10 h-10 rounded-xl" /><div className="flex-1 min-w-0"><p className="font-medium text-white truncate">{agent.name}</p><p className="text-xs text-gray-400 truncate">{agent.role}</p></div><div className={clsx('w-2 h-2 rounded-full', agent.is_active ? 'bg-green-400' : 'bg-gray-600')} /></div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <div className="flex items-center gap-3">{isTeamChat ? <><div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center"><Icons.Sparkles size={20} className="text-white" /></div><div><h1 className="font-bold text-white">Time Completo</h1><p className="text-xs text-gray-500">{agents.filter(a => a.is_active).length} agentes</p></div></> : activeAgents[0] && <><img src={activeAgents[0].avatar} className="w-10 h-10 rounded-xl" /><div><h1 className="font-bold text-white">{activeAgents[0].name}</h1><p className="text-xs text-gray-500">{activeAgents[0].role}</p></div></>}</div>
          {selectedClientId && <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-lg"><Icons.Building size={14} className="text-orange-400" /><span className="text-sm text-orange-400">{clients.find(c => c.id === selectedClientId)?.name}</span></div>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && <div className="text-center py-16"><div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4"><Icons.Chat size={32} className="text-gray-600" /></div><h3 className="text-lg font-bold text-white mb-2">Inicie uma conversa</h3><p className="text-gray-500 text-sm max-w-md mx-auto">Selecione um agente e peça para criar conteúdo.</p></div>}
          {messages.map(message => { const agent = getAgentById(message.agent_id); return (
            <div key={message.id} className={clsx('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
              {message.role === 'assistant' && agent && <img src={agent.avatar} className="w-8 h-8 rounded-lg flex-shrink-0" />}
              <div className={clsx('max-w-2xl rounded-2xl px-4 py-3', message.role === 'user' ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-100')}>{message.role === 'assistant' && agent && <p className="text-xs text-orange-400 font-medium mb-1">{agent.name}</p>}<div className="whitespace-pre-wrap text-sm">{message.content}</div></div>
              {message.role === 'user' && <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">U</div>}
            </div>
          ); })}
          {isLoading && streamingContent === '' && <div className="flex gap-3"><div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse" /><div className="bg-gray-800 rounded-2xl px-4 py-3"><Icons.Loader size={20} className="text-orange-400 animate-spin" /></div></div>}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex gap-3">
            <textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isTeamChat ? "Peça algo para o time..." : `Converse com ${activeAgents[0]?.name || 'o agente'}...`} rows={1} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:border-orange-500 focus:outline-none resize-none" style={{ minHeight: '48px', maxHeight: '120px' }} />
            <button onClick={handleSend} disabled={!inputMessage.trim() || isLoading} className={clsx('px-5 py-3 rounded-xl font-medium flex items-center gap-2', inputMessage.trim() && !isLoading ? 'bg-orange-500 hover:bg-orange-400 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed')}>{isLoading ? <Icons.Loader size={20} className="animate-spin" /> : <Icons.Send size={20} />}</button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">IA pode criar tarefas automaticamente • Enter para enviar</p>
        </div>
      </div>
    </div>
  );
};
