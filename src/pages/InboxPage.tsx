import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { TeamMessage } from '../types';

const CHANNELS = [
  { id: 'geral', name: '# geral', icon: Hash },
  { id: 'aprovacoes', name: '# aprovações', icon: Hash },
  { id: 'duvidas', name: '# dúvidas', icon: Hash },
];

function Hash() {
  return <Icons.Hash size={16} />;
}

export const InboxPage: React.FC = () => {
  const { agents, teamMessages, addTeamMessage, directMessages, addDirectMessage, user } = useStore();
  const [activeChannel, setActiveChannel] = useState('geral');
  const [activeDirectId, setActiveDirectId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [view, setView] = useState<'channels' | 'direct'>('channels');

  const filteredMessages = view === 'channels'
    ? teamMessages.filter(m => m.channel === activeChannel || !m.channel)
    : directMessages.filter(m => 
        (m.senderId === activeDirectId && m.receiverId === user?.id) ||
        (m.senderId === user?.id && m.receiverId === activeDirectId)
      );

  const handleSend = () => {
    if (!input.trim()) return;

    if (view === 'channels') {
      const newMessage: TeamMessage = {
        id: Date.now().toString(),
        senderId: 'user',
        senderName: 'Você',
        text: input,
        timestamp: new Date(),
        read: true,
        channel: activeChannel,
      };
      addTeamMessage(newMessage);
    } else if (activeDirectId) {
      addDirectMessage({
        id: Date.now().toString(),
        senderId: user?.id || 'user',
        receiverId: activeDirectId,
        senderName: user?.name || 'Você',
        text: input,
        timestamp: new Date(),
        read: false,
      });
    }
    setInput('');
  };

  const activeAgentDirect = agents.find(a => a.id === activeDirectId);

  return (
    <div className="flex h-full bg-gray-950">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Icons.MessageCircle size={20} className="text-orange-400" />
            Inbox da Equipe
          </h2>
          <p className="text-xs text-gray-500 mt-1">Comunicação interna entre gestores e criativos</p>
        </div>

        {/* Channels */}
        <div className="p-3">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Canais</p>
          {CHANNELS.map(channel => (
            <button
              key={channel.id}
              onClick={() => { setActiveChannel(channel.id); setView('channels'); setActiveDirectId(null); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                view === 'channels' && activeChannel === channel.id
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icons.Hash size={16} />
              {channel.id}
            </button>
          ))}
        </div>

        {/* Direct Messages */}
        <div className="p-3 border-t border-gray-800">
          <p className="text-xs font-bold text-gray-500 uppercase mb-2 px-2">Mensagens Diretas</p>
          {agents.slice(0, 4).map(agent => (
            <button
              key={agent.id}
              onClick={() => { setActiveDirectId(agent.id); setView('direct'); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                view === 'direct' && activeDirectId === agent.id
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="relative">
                <img src={agent.avatar} className="w-6 h-6 rounded-full" alt={agent.name} />
                {agent.isOnline && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-900" />
                )}
              </div>
              <span className="truncate">{agent.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6 bg-gray-900/50">
          {view === 'channels' ? (
            <div className="flex items-center gap-2">
              <Icons.Hash size={20} className="text-gray-500" />
              <span className="font-semibold text-white">{activeChannel}</span>
            </div>
          ) : activeAgentDirect && (
            <div className="flex items-center gap-3">
              <img src={activeAgentDirect.avatar} className="w-8 h-8 rounded-full" alt={activeAgentDirect.name} />
              <div>
                <p className="font-semibold text-white">{activeAgentDirect.name}</p>
                <p className="text-xs text-gray-500">{activeAgentDirect.role}</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Icons.MessageCircle size={48} className="mb-4 opacity-50" />
              <p>Nenhuma mensagem ainda</p>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const isMe = msg.senderId === 'user' || msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {isMe ? 'VO' : (msg.senderName?.substring(0, 2).toUpperCase() || 'AG')}
                    </div>
                    <div>
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-medium text-white">{msg.senderName}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`p-3 rounded-xl text-sm ${
                        isMe ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-200'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-4 py-2 border border-gray-700 focus-within:border-orange-500">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={view === 'channels' ? `Enviar mensagem para #${activeChannel}...` : `Mensagem para ${activeAgentDirect?.name}...`}
              className="flex-1 bg-transparent text-white focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`p-2 rounded-lg transition-colors ${
                input.trim() ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-gray-700 text-gray-500'
              }`}
            >
              <Icons.Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
