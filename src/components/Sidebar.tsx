import { NavLink, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { useStore } from '../store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { path: '/', icon: Icons.Dashboard, label: 'Dashboard' },
  { path: '/chat', icon: Icons.Chat, label: 'Chat IA', badge: '🤖' },
  { path: '/studio', icon: Icons.Studio, label: 'Creator Studio', badge: '🎬' },
  { path: '/workflow', icon: Icons.Kanban, label: 'Workflow' },
  { path: '/calendar', icon: Icons.Calendar, label: 'Calendário' },
  { path: '/clients', icon: Icons.Users, label: 'Clientes' },
  { path: '/agents', icon: Icons.Bot, label: 'Agentes' },
  { path: '/settings', icon: Icons.Settings, label: 'Config' },
  { path: '/admin', icon: Icons.Shield, label: 'Admin', adminOnly: true },
];

export const Sidebar = ({ onClose, isMobile }: SidebarProps) => {
  const navigate = useNavigate();
  const { notifications, demands, clients, currentUser, logout } = useStore();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingDemands = demands.filter((d) => d.status === 'aprovacao_cliente').length;

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado!');
    navigate('/login');
  };

  // Filtrar itens de admin se usuário não for admin
  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && currentUser?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside className="w-64 lg:w-64 h-full bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center">
            <Icons.Zap className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-bold text-white">BASE</h1>
            <p className="text-xs text-gray-500">Agency SaaS</p>
          </div>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg">
            <Icons.X size={20} />
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="p-3 lg:p-4 border-b border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded-xl p-2 lg:p-3 text-center">
            <p className="text-xl lg:text-2xl font-bold text-white">{clients.length}</p>
            <p className="text-xs text-gray-500">Clientes</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-2 lg:p-3 text-center">
            <p className="text-xl lg:text-2xl font-bold text-orange-500">{demands.length}</p>
            <p className="text-xs text-gray-500">Demandas</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => clsx(
              'flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all group',
              isActive ? 'bg-orange-500/20 text-orange-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            )}
          >
            <item.icon size={20} />
            <span className="flex-1 font-medium text-sm lg:text-base">{item.label}</span>
            {item.label === 'Workflow' && pendingDemands > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full text-xs">{pendingDemands}</span>
            )}
            {item.badge && <span className="text-sm">{item.badge}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Notifications */}
      {unreadCount > 0 && (
        <div className="px-3 lg:px-4 py-2 lg:py-3 border-t border-gray-800">
          <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
            <Icons.Bell className="text-orange-500" size={18} />
            <div className="flex-1">
              <p className="text-xs lg:text-sm text-white font-medium">{unreadCount} notificação(ões)</p>
            </div>
          </div>
        </div>
      )}

      {/* User */}
      <div className="p-3 lg:p-4 border-t border-gray-800">
        <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 bg-gray-800/50 rounded-xl">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{currentUser?.name || 'Usuário'}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser?.email || ''}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-1.5 lg:p-2 hover:bg-gray-700 rounded-lg transition"
            title="Sair"
          >
            <Icons.LogOut className="text-gray-400 hover:text-red-400" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
