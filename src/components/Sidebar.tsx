import { NavLink } from 'react-router-dom';
import { Icons } from './Icons';
import { useStore } from '../store';
import clsx from 'clsx';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: Icons.Dashboard },
  { path: '/chat', label: 'Chat IA', icon: Icons.Chat },
  { path: '/workflow', label: 'Workflow', icon: Icons.Kanban },
  { path: '/calendar', label: 'Calendário', icon: Icons.CalendarDays },
  { path: '/clients', label: 'Clientes', icon: Icons.Clients },
  { path: '/agents', label: 'Agentes IA', icon: Icons.Agents },
  { path: '/settings', label: 'Configurações', icon: Icons.Settings },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, clients, selectedClientId, setSelectedClientId } = useStore();

  return (
    <aside className={clsx(
      'h-screen bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-64'
    )}>
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Icons.Sparkles size={18} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white">BASE</span>
              <span className="text-orange-400 ml-1">Agency</span>
              <p className="text-[10px] text-gray-500">SaaS v5.0</p>
            </div>
          </div>
        )}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white">
          {sidebarCollapsed ? <Icons.ChevronRight size={18} /> : <Icons.ChevronLeft size={18} />}
        </button>
      </div>

      {!sidebarCollapsed && (
        <div className="p-3 border-b border-gray-800">
          <label className="text-[10px] uppercase text-gray-500 font-medium mb-1 block">Filtrar Cliente</label>
          <select value={selectedClientId || ''} onChange={(e) => setSelectedClientId(e.target.value || null)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
            <option value="">Todos os Clientes</option>
            {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
          </select>
        </div>
      )}

      <nav className="flex-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors',
            isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}>
            <item.icon size={20} />
            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <div className={clsx('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">U</div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Usuário Pro</p>
              <p className="text-xs text-gray-500 truncate">Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
