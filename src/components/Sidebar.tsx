import React from 'react';
import { Icons } from './Icons';
import { useStore } from '../store';
import clsx from 'clsx';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard },
  { id: 'chat', label: 'Chat IA', icon: Icons.Chat },
  { id: 'workflow', label: 'Workflow', icon: Icons.Kanban },
  { id: 'clients', label: 'Clientes', icon: Icons.Client },
  { id: 'contracts', label: 'Contratos', icon: Icons.Contract },
  { id: 'financial', label: 'Financeiro', icon: Icons.Money },
  { id: 'content', label: 'Conteúdos', icon: Icons.Folder },
  { id: 'agents', label: 'Agentes IA', icon: Icons.Agents },
  { id: 'knowledge', label: 'Conhecimento', icon: Icons.Knowledge },
  { id: 'team', label: 'Equipe', icon: Icons.Users },
  { id: 'settings', label: 'Configurações', icon: Icons.Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const { user, clients, selectedClientId, setSelectedClientId } = useStore();
  
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Icons.Zap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg">BASE Agency</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">SaaS v4.0</p>
          </div>
        </div>
      </div>
      
      <div className="p-3 border-b border-gray-800">
        <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1.5">Filtrar Cliente</label>
        <select
          value={selectedClientId || ''}
          onChange={(e) => setSelectedClientId(e.target.value || null)}
          className="w-full bg-gray-800 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
        >
          <option value="">Todos os Clientes</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-1 px-2">
          {MENU_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive 
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{user.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          <button className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-700">
            <Icons.LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
