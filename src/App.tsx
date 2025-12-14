import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPage } from './pages/ChatPage';
import { InboxPage } from './pages/InboxPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { AgentsPage } from './pages/AgentsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { StudioPage } from './pages/StudioPage';
import { SettingsPage } from './pages/SettingsPage';
import { useStore } from './store';
import { Icons } from './components/Icons';

type ViewType = 'chat' | 'inbox' | 'workflow' | 'agents' | 'knowledge' | 'studio' | 'settings';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const { notifications, markNotificationRead } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifications = notifications.filter(n => !n.read);

  const renderView = () => {
    switch (activeView) {
      case 'chat': return <ChatPage />;
      case 'inbox': return <InboxPage />;
      case 'workflow': return <WorkflowPage />;
      case 'agents': return <AgentsPage />;
      case 'knowledge': return <KnowledgePage />;
      case 'studio': return <StudioPage />;
      case 'settings': return <SettingsPage />;
      default: return <ChatPage />;
    }
  };

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (unreadNotifications.length > 0) {
      const timer = setTimeout(() => {
        unreadNotifications.forEach(n => markNotificationRead(n.id));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [unreadNotifications, markNotificationRead]);

  return (
    <div className="flex h-screen w-full bg-gray-950 text-white overflow-hidden">
      <Sidebar activeView={activeView} onViewChange={(view) => setActiveView(view as ViewType)} />
      
      <main className="flex-1 h-full overflow-hidden relative">
        {renderView()}

        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="absolute top-4 right-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors z-50"
        >
          <Icons.Bell size={20} className={unreadNotifications.length > 0 ? 'text-orange-400' : 'text-gray-400'} />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotifications.length}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {showNotifications && (
          <div className="absolute top-16 right-4 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden">
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Notificações</h3>
              <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-white">
                <Icons.Close size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  <Icons.Bell size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                notifications.slice(0, 10).map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer transition-colors ${
                      !notif.read ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notif.type === 'success' ? 'bg-green-500/20 text-green-400' :
                        notif.type === 'error' ? 'bg-red-500/20 text-red-400' :
                        notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {notif.type === 'success' ? <Icons.Success size={16} /> :
                         notif.type === 'error' ? <Icons.Alert size={16} /> :
                         notif.type === 'warning' ? <Icons.Alert size={16} /> :
                         <Icons.Info size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {unreadNotifications.slice(0, 3).map((notif, index) => (
            <div
              key={notif.id}
              className={`p-4 bg-gray-900 border rounded-xl shadow-2xl max-w-sm animate-slide-in ${
                notif.type === 'success' ? 'border-green-500/50' :
                notif.type === 'error' ? 'border-red-500/50' :
                notif.type === 'warning' ? 'border-yellow-500/50' :
                'border-blue-500/50'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.type === 'success' ? 'bg-green-500/20 text-green-400' :
                  notif.type === 'error' ? 'bg-red-500/20 text-red-400' :
                  notif.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {notif.type === 'success' ? <Icons.Success size={16} /> :
                   notif.type === 'error' ? <Icons.Alert size={16} /> :
                   notif.type === 'warning' ? <Icons.Alert size={16} /> :
                   <Icons.Info size={16} />}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-sm">{notif.title}</p>
                  <p className="text-xs text-gray-400">{notif.message}</p>
                </div>
                <button
                  onClick={() => markNotificationRead(notif.id)}
                  className="text-gray-500 hover:text-white"
                >
                  <Icons.Close size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
