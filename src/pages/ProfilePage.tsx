import { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export const ProfilePage = () => {
  const { currentUser, setCurrentUser } = useStore();

  // Profile form
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    whatsapp: false,
  });
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('pt-BR');

  const handleSaveProfile = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setCurrentUser({
      ...currentUser!,
      name,
      email,
    });

    toast.success('Perfil atualizado!');
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      toast.error('Digite a senha atual');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    // TODO: Implementar com Supabase
    toast.success('Senha alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Icons.User size={28} className="text-orange-400" />
            Meu Perfil
          </h1>
          <p className="text-gray-400 mt-1">Gerencie suas informações pessoais e preferências</p>
        </div>

        {/* Avatar & Basic Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition">
                <Icons.Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-800">
            <button
              onClick={handleSaveProfile}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center gap-2"
            >
              <Icons.Save size={16} />
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Lock size={20} className="text-orange-400" />
            Alterar Senha
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Senha Atual</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPasswords ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nova Senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirmar Nova Senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleChangePassword}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition flex items-center gap-2"
              >
                <Icons.Key size={16} />
                Alterar Senha
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Bell size={20} className="text-orange-400" />
            Notificações
          </h3>

          <div className="space-y-4">
            {[
              { key: 'email', label: 'Notificações por Email', description: 'Receba atualizações importantes por email' },
              { key: 'push', label: 'Notificações Push', description: 'Notificações no navegador' },
              { key: 'whatsapp', label: 'WhatsApp', description: 'Receba notificações via WhatsApp' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <div>
                  <p className="text-white font-medium">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition relative',
                    notifications[item.key as keyof typeof notifications] ? 'bg-orange-500' : 'bg-gray-600'
                  )}
                >
                  <div className={clsx(
                    'w-5 h-5 bg-white rounded-full absolute top-0.5 transition',
                    notifications[item.key as keyof typeof notifications] ? 'left-6' : 'left-0.5'
                  )} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Settings size={20} className="text-orange-400" />
            Preferências
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tema</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Idioma</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Info size={20} className="text-orange-400" />
            Informações da Conta
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-gray-400">ID do Usuário</span>
              <span className="text-gray-300 font-mono">{currentUser?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-gray-400">Função</span>
              <span className="text-orange-400 font-medium">{currentUser?.role || 'Membro'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-gray-400">Membro desde</span>
              <span className="text-gray-300">Dezembro 2024</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <button className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2">
              <Icons.Trash size={14} />
              Excluir minha conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
