import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import clsx from 'clsx';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, addNotification } = useStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'agency' | 'integrations' | 'notifications'>('profile');
  const [profileData, setProfileData] = useState({ name: user.name, email: user.email, avatar: user.avatar || '' });
  const [agencyData, setAgencyData] = useState({ name: 'BASE Agency', logo: '', primaryColor: '#f97316', timezone: 'America/Sao_Paulo' });

  const handleSaveProfile = () => { updateUser(profileData); addNotification({ id: `notif-${Date.now()}`, title: 'Perfil Atualizado', message: 'Suas informações foram salvas', type: 'success', read: false, timestamp: new Date().toISOString() }); };

  const tabs = [{ id: 'profile', label: 'Perfil', icon: Icons.User }, { id: 'agency', label: 'Agência', icon: Icons.Client }, { id: 'integrations', label: 'Integrações', icon: Icons.Zap }, { id: 'notifications', label: 'Notificações', icon: Icons.Bell }];

  return (
    <div className="h-full bg-gray-950 flex">
      <div className="w-64 border-r border-gray-800 p-4">
        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6"><Icons.Settings size={24} className="text-orange-400" />Configurações</h1>
        <nav className="space-y-1">{tabs.map(tab => { const Icon = tab.icon; return (<button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === tab.id ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}><Icon size={18} />{tab.label}</button>); })}</nav>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'profile' && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-white mb-6">Perfil do Usuário</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-4 mb-6"><div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-2xl">{profileData.name.charAt(0)}</div><div><h3 className="font-bold text-white">{profileData.name}</h3><p className="text-sm text-gray-500">{profileData.email}</p><p className="text-xs text-orange-400 capitalize mt-1">{user.role}</p></div></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome</label><input type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Email</label><input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
              <button onClick={handleSaveProfile} className="w-full py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold mt-4">Salvar Alterações</button>
            </div>
          </div>
        )}
        {activeTab === 'agency' && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-white mb-6">Configurações da Agência</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Nome da Agência</label><input type="text" value={agencyData.name} onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Cor Principal</label><div className="flex items-center gap-3"><input type="color" value={agencyData.primaryColor} onChange={(e) => setAgencyData({ ...agencyData, primaryColor: e.target.value })} className="w-12 h-10 rounded-lg bg-transparent border-0 cursor-pointer" /><input type="text" value={agencyData.primaryColor} onChange={(e) => setAgencyData({ ...agencyData, primaryColor: e.target.value })} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none" /></div></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Fuso Horário</label><select value={agencyData.timezone} onChange={(e) => setAgencyData({ ...agencyData, timezone: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-orange-500 focus:outline-none"><option value="America/Sao_Paulo">Brasília (GMT-3)</option><option value="America/New_York">Nova York (GMT-5)</option><option value="Europe/London">Londres (GMT)</option></select></div>
              <button className="w-full py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold mt-4">Salvar Configurações</button>
            </div>
          </div>
        )}
        {activeTab === 'integrations' && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-white mb-6">Integrações</h2>
            <div className="space-y-4">
              {[{ name: 'Google Gemini', desc: 'IA para geração de conteúdo', connected: true, icon: '🤖' }, { name: 'Instagram', desc: 'Publicação automática', connected: false, icon: '📸' }, { name: 'Meta Ads', desc: 'Gerenciamento de anúncios', connected: false, icon: '📊' }, { name: 'Google Analytics', desc: 'Métricas de performance', connected: false, icon: '📈' }].map(int => (
                <div key={int.name} className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-2xl">{int.icon}</span><div><h3 className="font-medium text-white">{int.name}</h3><p className="text-xs text-gray-500">{int.desc}</p></div></div><button className={clsx('px-4 py-2 rounded-lg text-sm font-medium', int.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700')}>{int.connected ? '✓ Conectado' : 'Conectar'}</button></div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'notifications' && (
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-white mb-6">Preferências de Notificação</h2>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
              {[{ id: 'tasks', label: 'Novas tarefas', desc: 'Quando uma demanda for criada' }, { id: 'approvals', label: 'Aprovações', desc: 'Quando um conteúdo for aprovado/rejeitado' }, { id: 'payments', label: 'Pagamentos', desc: 'Quando um pagamento for recebido' }, { id: 'reports', label: 'Relatórios', desc: 'Relatórios semanais de performance' }].map(pref => (
                <label key={pref.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800"><div><h4 className="font-medium text-white text-sm">{pref.label}</h4><p className="text-xs text-gray-500">{pref.desc}</p></div><input type="checkbox" defaultChecked className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-orange-500" /></label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
