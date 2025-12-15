import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Icons } from './components/Icons';
import { useStore } from './store';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { ClientsPage } from './pages/ClientsPage';
import { ContractsPage } from './pages/ContractsPage';
import { FinancialPage } from './pages/FinancialPage';
import { ContentPage } from './pages/ContentPage';
import { AgentsPage } from './pages/AgentsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';

const NotificationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markNotificationRead, clearNotifications } = useStore();
  
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div 
        className="absolute top-16 right-4 w-96 max-h-[70vh] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="font-bold text-white">Notificações</h3>
          <button onClick={clearNotifications} className="text-xs text-gray-500 hover:text-white">Limpar todas</button>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Icons.Bell size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-4 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/50 transition-colors ${!notif.read ? 'bg-orange-500/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    notif.type === 'success' ? 'bg-green-400' :
                    notif.type === 'warning' ? 'bg-yellow-400' :
                    notif.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{notif.title}</p>
                    <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const Toast: React.FC<{ notification: any; onClose: () => void }> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg animate-slide-in ${
      notification.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
      notification.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
      notification.type === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'
    }`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
        notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
        notification.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
      }`}>
        {notification.type === 'success' ? <Icons.Check size={18} /> :
         notification.type === 'warning' ? <Icons.Alert size={18} /> :
         notification.type === 'error' ? <Icons.Error size={18} /> : <Icons.Info size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{notification.title}</p>
        <p className="text-xs text-gray-400 truncate">{notification.message}</p>
      </div>
      <button onClick={onClose} className="text-gray-500 hover:text-white"><Icons.Close size={16} /></button>
    </div>
  );
};

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);
  const { notifications } = useStore();
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      if (!toasts.find(t => t.id === latest.id)) {
        setToasts(prev => [...prev, latest].slice(-3));
      }
    }
  }, [notifications]);
  
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  
  const renderPage = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardPage />;
      case 'chat': return <ChatPage />;
      case 'workflow': return <WorkflowPage />;
      case 'clients': return <ClientsPage />;
      case 'contracts': return <ContractsPage />;
      case 'financial': return <FinancialPage />;
      case 'content': return <ContentPage />;
      case 'agents': return <AgentsPage />;
      case 'knowledge': return <KnowledgePage />;
      case 'team': return <TeamPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-800 flex items-center justify-end px-6 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="text" placeholder="Buscar..." className="bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-orange-500 focus:outline-none w-64" />
            </div>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              <Icons.Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">{renderPage()}</main>
      </div>
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-md">
        {toasts.map(toast => (<Toast key={toast.id} notification={toast} onClose={() => removeToast(toast.id)} />))}
      </div>
    </div>
  );
}

export default App;
