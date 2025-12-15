import { NavLink } from 'react-router-dom';
import { Icons } from './Icons';
import { useStore } from '../store';
import clsx from 'clsx';

const navItems = [
  { path: '/', icon: Icons.Dashboard, label: 'Dashboard' },
  { path: '/chat', icon: Icons.Chat, label: 'Chat IA', badge: '🤖' },
  { path: '/workflow', icon: Icons.Kanban, label: 'Workflow' },
  { path: '/calendar', icon: Icons.Calendar, label: 'Calendário' },
  { path: '/clients', icon: Icons.Users, label: 'Clientes' },
  { path: '/agents', icon: Icons.Bot, label: 'Agentes' },
  { path: '/settings', icon: Icons.Settings, label: 'Configurações' },
];

export const Sidebar = () => {
  const { notifications, demands, clients } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingDemands = demands.filter((d) => d.status === 'aprovacao_cliente').length;

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
            <Icons.Zap className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">BASE</h1>
            <p className="text-xs text-gray-500">Agency SaaS</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-b border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-white">{clients.length}</p>
            <p className="text-xs text-gray-500">Clientes</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{demands.length}</p>
            <p className="text-xs text-gray-500">Demandas</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all group',
              isActive ? 'bg-orange-500/20 text-orange-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <item.icon size={20} />
            <span className="flex-1 font-medium">{item.label}</span>
            {item.label === 'Workflow' && pendingDemands > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full text-xs">{pendingDemands}</span>
            )}
            {item.badge && <span className="text-sm">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>


      {/* Notifications */}
      {unreadCount > 0 && (
        <div className="px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <Icons.Bell className="text-orange-500" size={20} />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{unreadCount} notificação(ões)</p>
              <p className="text-xs text-gray-500">Clique para ver</p>
            </div>
          </div>
        </div>
      )}

      {/* User */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">A</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">Admin</p>
            <p className="text-xs text-gray-500 truncate">admin@base.ai</p>
          </div>
          <button className="p-2 hover:bg-gray-700 rounded-lg transition">
            <Icons.LogOut className="text-gray-400" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
};
