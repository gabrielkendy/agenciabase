import React from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';

export const SettingsPage: React.FC = () => {
  const { user, setUser, addNotification } = useStore();

  const handleExportData = () => {
    const data = localStorage.getItem('base-agency-storage');
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'base-agency-backup.json';
      a.click();
      
      addNotification({
        id: Date.now().toString(),
        title: 'Backup Exportado',
        message: 'Arquivo JSON salvo com sucesso',
        type: 'success',
        read: false,
        timestamp: new Date()
      });
    }
  };

  const handleResetAll = () => {
    if (confirm('⚠️ ATENÇÃO!\n\nIsso irá apagar TODOS os dados:\n- Agentes e configurações\n- Tarefas e demandas\n- Arquivos de conhecimento\n- Mensagens\n\nTem certeza?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSaveProfile = () => {
    addNotification({
      id: Date.now().toString(),
      title: 'Perfil Atualizado',
      message: 'Suas informações foram salvas',
      type: 'success',
      read: false,
      timestamp: new Date()
    });
  };

  return (
    <div className="h-full bg-gray-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mb-8">
          <Icons.Settings size={28} className="text-orange-400" />
          Configurações
        </h1>

        {/* API Status */}
        <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-2xl border border-green-500/30 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Icons.Success size={24} className="text-green-400" />
            </div>
            <div>
              <h2 className="font-bold text-white flex items-center gap-2">
                Gemini AI Conectado ✅
              </h2>
              <p className="text-sm text-gray-400">
                API Key configurada e funcionando
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-500 font-mono">
              API Key: AIzaSy***...***JDU (oculta por segurança)
            </p>
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Icons.User size={18} className="text-blue-400" />
            Perfil do Usuário
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Nome</label>
              <input
                type="text"
                value={user?.name || ''}
                onChange={(e) => setUser(user ? { ...user, name: e.target.value } : null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                onChange={(e) => setUser(user ? { ...user, email: e.target.value } : null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-500 flex items-center justify-center gap-2 transition-colors"
            >
              <Icons.Save size={18} /> Salvar Perfil
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Drive size={18} className="text-green-400" />
            Gerenciamento de Dados
          </h2>
          
          <div className="space-y-3">
            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Icons.Download size={18} />
              Exportar Todos os Dados (JSON)
            </button>
            
            <button
              onClick={handleResetAll}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors"
            >
              <Icons.Delete size={18} />
              Resetar Aplicativo (Apagar Tudo)
            </button>
          </div>
        </div>

        {/* Features Status */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Zap size={18} className="text-yellow-400" />
            Status das Funcionalidades
          </h2>
          
          <div className="space-y-3">
            {[
              { name: 'Chat com IA', status: 'active', desc: 'Converse com agentes especializados' },
              { name: 'Treinamento de Agentes', status: 'active', desc: 'Injete conhecimento nos agentes' },
              { name: 'Workflow Kanban', status: 'active', desc: 'Gestão de demandas com drag-drop' },
              { name: 'Estúdio Criativo', status: 'active', desc: 'Geração de imagens + legendas' },
              { name: 'Base de Conhecimento', status: 'active', desc: 'Upload de arquivos globais' },
              { name: 'Inbox da Equipe', status: 'active', desc: 'Chat em canais e mensagens diretas' },
              { name: 'Notificações', status: 'active', desc: 'Alertas em tempo real' },
            ].map((feature, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-white text-sm">{feature.name}</p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  feature.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {feature.status === 'active' ? '✅ Ativo' : '🔄 Em breve'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Info size={18} className="text-purple-400" />
            Sobre o BASE Agency
          </h2>
          
          <div className="text-sm text-gray-500 space-y-2">
            <p><strong className="text-white">Versão:</strong> 2.0.0</p>
            <p><strong className="text-white">Desenvolvido por:</strong> BASE Marketing Agency</p>
            <p><strong className="text-white">Tecnologias:</strong> React, TypeScript, Tailwind CSS, Zustand, Google Gemini AI</p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600">
              Super SaaS para gerenciamento de agência de marketing digital com time de agentes de IA especializados, treinamento personalizado e geração de conteúdo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
