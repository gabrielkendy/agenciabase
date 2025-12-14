import React, { useState } from 'react';
import { Icons } from './Icons';
import { useStore } from '../store';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const menuItems = [
  { id: 'chat', icon: Icons.Chat, label: 'Chat IA' },
  { id: 'inbox', icon: Icons.MessageCircle, label: 'Inbox Equipe' },
  { id: 'workflow', icon: Icons.Board, label: 'Workflow' },
  { id: 'agents', icon: Icons.Agents, label: 'Agentes' },
  { id: 'knowledge', icon: Icons.Drive, label: 'Conhecimento' },
  { id: 'studio', icon: Icons.Wand, label: 'Estúdio Criativo' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, notifications } = useStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <aside className={`h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20">
            B
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-white">BASE Agency</h1>
              <p className="text-[10px] text-gray-500">Super SaaS</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-800 text-gray-500 transition-colors"
        >
          {collapsed ? <Icons.ChevronRight size={18} /> : <Icons.ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showBadge = item.id === 'workflow' && unreadCount > 0;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              {!collapsed && (
                <span className="flex-1 text-left font-medium">{item.label}</span>
              )}
              {showBadge && (
                <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
        
        {/* Settings */}
        <div className="pt-4 mt-4 border-t border-gray-800">
          <button
            onClick={() => onViewChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              activeView === 'settings' 
                ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icons.Settings size={20} />
            {!collapsed && <span className="font-medium">Configurações</span>}
          </button>
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className={`flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
