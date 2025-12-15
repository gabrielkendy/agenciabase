import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { streamChatResponse, analyzeAndCreateTask } from '../services/geminiService';
import type { ChatMessage, Task } from '../types';

export const ChatPage: React.FC = () => {
  const { agents, activeAgentId, setActiveAgentId, globalKnowledge, addTask, addNotification, clients, selectedClientId } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const activeAgent = agents.find(a => a.id === activeAgentId) || agents[0];
  const isSofia = activeAgentId === 'agent-sofia';
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', text: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    const tempId = `msg-${Date.now() + 1}`;
    const tempMessage: ChatMessage = { id: tempId, role: 'model', text: '', timestamp: new Date().toISOString(), agentId: activeAgent.id, agentName: activeAgent.name, agentAvatar: activeAgent.avatar };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      if (isSofia) {
        const clientId = selectedClientId || clients[0]?.id || 'client-demo';
        const result = await analyzeAndCreateTask(input, clientId, globalKnowledge);
        if (result.shouldCreateTask && result.task) {
          const newTask = result.task as Task;
          addTask(newTask);
          addNotification({ id: `notif-${Date.now()}`, title: '✅ Nova Demanda Criada!', message: newTask.title, type: 'success', read: false, link: 'workflow', timestamp: new Date().toISOString() });
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: result.response, createdTask: newTask } : msg));
        } else {
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: result.response } : msg));
        }
      } else {
        let fullResponse = '';
        await streamChatResponse(activeAgent, messages.filter(m => m.role !== 'model' || m.text).map(m => ({ role: m.role, text: m.text })), input, globalKnowledge, (chunk) => {
          fullResponse += chunk;
          setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: fullResponse } : msg));
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, text: '❌ Erro ao processar. Verifique sua conexão e tente novamente.' } : msg));
    } finally { setIsLoading(false); }
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-950">
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={activeAgent.avatar} alt={activeAgent.name} className="w-10 h-10 rounded-full border-2 border-orange-500" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </div>
          <div><h2 className="font-semibold text-white">{activeAgent.name}</h2><p className="text-xs text-gray-400">{activeAgent.role}{isSofia && ' • Cria tarefas automaticamente 🚀'}</p></div>
        </div>
        <div className="flex items-center gap-3">
          <select value={activeAgentId} onChange={(e) => setActiveAgentId(e.target.value)} className="bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none">
            {agents.map(a => (<option key={a.id} value={a.id}>{a.name} ({a.role})</option>))}
          </select>
          {messages.length > 0 && (<button onClick={() => setMessages([])} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Limpar conversa"><Icons.Delete size={18} /></button>)}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <img src={activeAgent.avatar} className="w-24 h-24 rounded-full mb-4 border-2 border-gray-700" alt="Agent" />
            <h3 className="text-xl font-bold text-white mb-2">{activeAgent.name}</h3>
            <p className="text-sm text-gray-400 text-center max-w-md">{activeAgent.description}</p>
            {isSofia && (<div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl max-w-md"><p className="text-sm text-orange-400 text-center">💡 <strong>Dica:</strong> Descreva uma demanda de conteúdo e eu vou criar automaticamente no Kanban!</p></div>)}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="flex-shrink-0 mt-1">
                {msg.role === 'model' ? (<img src={msg.agentAvatar || activeAgent.avatar} className="w-8 h-8 rounded-full border border-orange-500/50" alt="Bot" />) : (<div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">EU</div>)}
              </div>
              <div className="space-y-2">
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-tr-sm' : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'}`}>
                  {msg.role === 'model' && !msg.text && isLoading && (<span className="flex items-center gap-2 text-orange-400"><Icons.Loader size={14} className="animate-spin" /> Pensando...</span>)}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
                {msg.createdTask && (<div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl"><div className="flex items-center gap-2 mb-2"><Icons.Success size={16} className="text-green-400" /><span className="text-xs font-bold text-green-400">TAREFA CRIADA</span></div><p className="text-sm text-white font-medium">{msg.createdTask.title}</p><div className="flex items-center gap-2 mt-2"><span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{msg.createdTask.channel}</span><span className={`text-xs px-2 py-0.5 rounded ${msg.createdTask.priority === 'high' ? 'bg-red-500/20 text-red-400' : msg.createdTask.priority === 'urgent' ? 'bg-red-600/30 text-red-300' : msg.createdTask.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>{msg.createdTask.priority}</span></div></div>)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end gap-2 bg-gray-800 p-2 rounded-xl border border-gray-700 focus-within:border-orange-500 transition-colors">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={isSofia ? 'Descreva a demanda de conteúdo e eu crio no Kanban...' : `Mensagem para ${activeAgent.name}...`} className="flex-1 bg-transparent text-white p-2 max-h-32 min-h-[44px] resize-none focus:outline-none" rows={1} />
          <button onClick={handleSend} disabled={isLoading || !input.trim()} className={`p-3 rounded-lg transition-all ${input.trim() && !isLoading ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-orange-500/20' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
            {isLoading ? <Icons.Loader size={20} className="animate-spin" /> : <Icons.Send size={20} />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">✅ Gemini AI conectado • {activeAgent.knowledgeFiles.length + globalKnowledge.length} arquivos de conhecimento</p>
      </div>
    </div>
  );
};
