import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Sidebar } from './components/Sidebar';
import { Icons } from './components/Icons';
import { useStore } from './store';
import { secureSession, auditLog } from './lib/security';

// ============================================
// LAZY LOADED PAGES (Performance Optimization)
// ============================================

// Core pages - immediate load
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';

// Heavy pages - lazy loaded for better initial load
const ChatPage = lazy(() => import('./pages/ChatPage').then(m => ({ default: m.ChatPage })));
const WorkflowPage = lazy(() => import('./pages/WorkflowPage').then(m => ({ default: m.WorkflowPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const ClientsPage = lazy(() => import('./pages/ClientsPage').then(m => ({ default: m.ClientsPage })));
const AgentsPage = lazy(() => import('./pages/AgentsPage').then(m => ({ default: m.AgentsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const CreatorStudioPage = lazy(() => import('./pages/CreatorStudioPage').then(m => ({ default: m.CreatorStudioPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const ContentCreatorPage = lazy(() => import('./pages/ContentCreatorPage').then(m => ({ default: m.ContentCreatorPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const ApprovalPage = lazy(() => import('./pages/ApprovalPage').then(m => ({ default: m.ApprovalPage })));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage').then(m => ({ default: m.ChatbotPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));

// Super Admin Pages - lazy loaded
const SuperAdminDashboard = lazy(() => import('./pages/super-admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const TenantsPage = lazy(() => import('./pages/super-admin/TenantsPage').then(m => ({ default: m.TenantsPage })));
const PlansPage = lazy(() => import('./pages/super-admin/PlansPage').then(m => ({ default: m.PlansPage })));
const GlobalIntegrationsPage = lazy(() => import('./pages/super-admin/GlobalIntegrationsPage').then(m => ({ default: m.GlobalIntegrationsPage })));
const UsageAnalyticsPage = lazy(() => import('./pages/super-admin/UsageAnalyticsPage').then(m => ({ default: m.UsageAnalyticsPage })));

// ============================================
// LOADING COMPONENT
// ============================================
const PageLoader = () => (
  <div className="flex-1 flex items-center justify-center bg-gray-950 min-h-screen-safe">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  </div>
);

// ============================================
// PROTECTED ROUTES
// ============================================
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, logout } = useStore();

  useEffect(() => {
    if (currentUser && !secureSession.checkActivity()) {
      toast.error('Sessão expirada por inatividade');
      auditLog.log(currentUser.id, 'SESSION_EXPIRED', 'auth', 'Sessão expirada por inatividade');
      logout();
    }
  }, [currentUser, logout]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== 'super_admin') {
    toast.error('Acesso negado: apenas Super Admin');
    auditLog.log(currentUser.id, 'ACCESS_DENIED', 'super-admin', `Tentativa de acesso não autorizado`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== 'super_admin' && currentUser.role !== 'admin') {
    toast.error('Acesso negado: apenas Administradores');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ============================================
// MAIN APP CONTENT
// ============================================
function AppContent() {
  const location = useLocation();
  const { currentUser } = useStore();
  const isPublicPage = location.pathname.startsWith('/aprovacao') ||
                       location.pathname.startsWith('/bot') ||
                       location.pathname === '/login' ||
                       location.pathname === '/reset-password';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Handle resize with debounce for performance
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 1024);
        if (window.innerWidth >= 1024) {
          setSidebarOpen(false);
        }
      }, 100);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Public pages
  if (isPublicPage) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={
            currentUser ? <Navigate to="/" replace /> : <LoginPage />
          } />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/aprovacao/:token" element={<ApprovalPage />} />
          <Route path="/bot/:botId" element={<ChatbotPage />} />
          <Route path="/bot" element={<ChatbotPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 z-40 safe-top">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition active:scale-95"
            aria-label="Toggle menu"
          >
            <Icons.Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <Icons.Zap className="text-white" size={18} />
            </div>
            <span className="font-bold text-white">BASE</span>
          </div>
          <div className="w-10" />
        </header>
      )}

      {/* Overlay with backdrop blur */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with smooth animation */}
      <div className={`
        ${isMobile ? 'fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out' : 'relative'}
        ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
      </div>

      {/* Main Content with Suspense for lazy loading */}
      <main className={`flex-1 overflow-hidden ${isMobile ? 'pt-14' : ''}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/workflow" element={<ProtectedRoute><WorkflowPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/studio" element={<ProtectedRoute><CreatorStudioPage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/content/:demandId" element={<ProtectedRoute><ContentCreatorPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/super-admin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/super-admin/tenants" element={<SuperAdminRoute><TenantsPage /></SuperAdminRoute>} />
            <Route path="/super-admin/plans" element={<SuperAdminRoute><PlansPage /></SuperAdminRoute>} />
            <Route path="/super-admin/integrations" element={<SuperAdminRoute><GlobalIntegrationsPage /></SuperAdminRoute>} />
            <Route path="/super-admin/analytics" element={<SuperAdminRoute><UsageAnalyticsPage /></SuperAdminRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

// ============================================
// APP ROOT
// ============================================
function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            fontSize: '14px',
          },
          className: 'text-sm',
          duration: 3000,
        }}
      />
    </BrowserRouter>
  );
}

export default App;
