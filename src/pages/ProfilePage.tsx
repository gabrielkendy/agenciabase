import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// ============================================
// KEYS E TIPOS PARA 2FA
// ============================================
const LOCAL_USERS_KEY = 'base_agency_users';
const VERIFICATION_CODES_KEY = 'base_agency_verification_codes';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface VerificationCode {
  email: string;
  code: string;
  type: string;
  expiresAt: number;
  attempts: number;
}

// Funções auxiliares
const getLocalUsers = (): LocalUser[] => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LocalUser[];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: LocalUser[]) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const updateLocalUser = (email: string, updates: Partial<LocalUser>) => {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (index >= 0) {
    users[index] = { ...users[index], ...updates };
    saveLocalUsers(users);
    return true;
  }
  return false;
};

const getLocalUser = (email: string): LocalUser | null => {
  const users = getLocalUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveVerificationCode = (code: VerificationCode) => {
  try {
    const stored = localStorage.getItem(VERIFICATION_CODES_KEY);
    const codes: VerificationCode[] = stored ? JSON.parse(stored) : [];
    const filtered = codes.filter(c => !(c.email === code.email && c.type === code.type));
    filtered.push(code);
    localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(filtered));
  } catch {}
};

const validateCode = (email: string, inputCode: string, type: string): boolean => {
  try {
    const stored = localStorage.getItem(VERIFICATION_CODES_KEY);
    if (!stored) return false;
    const codes: VerificationCode[] = JSON.parse(stored);
    const codeIndex = codes.findIndex(c =>
      c.email.toLowerCase() === email.toLowerCase() && c.type === type
    );
    if (codeIndex === -1) return false;
    const code = codes[codeIndex];
    if (code.expiresAt < Date.now() || code.attempts >= 5) {
      codes.splice(codeIndex, 1);
      localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
      return false;
    }
    if (code.code === inputCode) {
      codes.splice(codeIndex, 1);
      localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
      return true;
    }
    codes[codeIndex].attempts += 1;
    localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
    return false;
  } catch {
    return false;
  }
};

// ============================================
// COMPONENTE OTP INPUT
// ============================================
const OTPInput = ({
  length = 6,
  value,
  onChange
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    const newValue = value.split('');
    newValue[index] = val.slice(-1);
    const finalValue = newValue.join('').slice(0, length);
    onChange(finalValue);
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={el => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-10 h-12 text-center text-xl font-bold bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none transition"
          autoComplete="off"
        />
      ))}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
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

  // 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Preferences
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    whatsapp: false,
  });
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [language, setLanguage] = useState('pt-BR');

  // Load 2FA status
  useEffect(() => {
    if (currentUser?.email) {
      const user = getLocalUser(currentUser.email);
      if (user) {
        setTwoFactorEnabled(user.twoFactorEnabled || false);
      }
    }
  }, [currentUser?.email]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

    // Verificar senha atual
    const user = getLocalUser(currentUser?.email || '');
    if (user && user.password !== currentPassword) {
      toast.error('Senha atual incorreta');
      return;
    }

    // Atualizar senha
    updateLocalUser(currentUser?.email || '', { password: newPassword });

    toast.success('Senha alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleEnable2FA = () => {
    if (!currentUser?.email) return;

    // Gerar e salvar código
    const code = generateCode();
    console.log(`[DEBUG 2FA] Código: ${code}`);

    saveVerificationCode({
      email: currentUser.email,
      code,
      type: '2fa-setup',
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    setShow2FASetup(true);
    setResendCooldown(60);
    toast.success('Código enviado para seu email!');
  };

  const handleVerify2FASetup = () => {
    if (!currentUser?.email) return;
    if (otpCode.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    const isValid = validateCode(currentUser.email, otpCode, '2fa-setup');

    if (!isValid) {
      toast.error('Código inválido ou expirado');
      return;
    }

    // Ativar 2FA
    updateLocalUser(currentUser.email, { twoFactorEnabled: true });
    setTwoFactorEnabled(true);
    setShow2FASetup(false);
    setOtpCode('');
    toast.success('Autenticação em 2 fatores ativada!');
  };

  const handleDisable2FA = () => {
    if (!currentUser?.email) return;

    updateLocalUser(currentUser.email, { twoFactorEnabled: false });
    setTwoFactorEnabled(false);
    toast.success('Autenticação em 2 fatores desativada');
  };

  const handleResendCode = () => {
    if (resendCooldown > 0 || !currentUser?.email) return;

    const code = generateCode();
    console.log(`[DEBUG 2FA] Novo código: ${code}`);

    saveVerificationCode({
      email: currentUser.email,
      code,
      type: '2fa-setup',
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
    });

    setOtpCode('');
    setResendCooldown(60);
    toast.success('Novo código enviado!');
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <Icons.User size={24} className="text-orange-400" />
            Meu Perfil
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Gerencie suas informações pessoais e preferências</p>
        </div>

        {/* Avatar & Basic Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                {name.charAt(0).toUpperCase() || 'U'}
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition">
                <Icons.Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-800">
            <button
              onClick={handleSaveProfile}
              className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition flex items-center justify-center gap-2"
            >
              <Icons.Save size={16} />
              Salvar Alterações
            </button>
          </div>
        </div>

        {/* 2FA Security */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Shield size={20} className="text-orange-400" />
            Autenticação em 2 Fatores (2FA)
          </h3>

          {show2FASetup ? (
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <p className="text-orange-400 text-sm mb-2">
                  Digite o código de 6 dígitos enviado para:
                </p>
                <p className="text-white font-medium">{currentUser?.email}</p>
              </div>

              <OTPInput value={otpCode} onChange={setOtpCode} />

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleVerify2FASetup}
                  disabled={otpCode.length !== 6}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Icons.Check size={16} />
                  Verificar e Ativar
                </button>
                <button
                  onClick={() => { setShow2FASetup(false); setOtpCode(''); }}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition"
                >
                  Cancelar
                </button>
              </div>

              <button
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="w-full text-orange-500 hover:text-orange-400 text-sm disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
              </button>

              {/* Debug Info */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-500 text-xs text-center">
                  <Icons.AlertTriangle className="inline mr-1" size={14} />
                  Modo dev: Verifique o console para o código
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={clsx(
                'flex items-center justify-between p-4 rounded-xl',
                twoFactorEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800/50'
              )}>
                <div className="flex items-center gap-3">
                  {twoFactorEnabled ? (
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Icons.ShieldCheck size={20} className="text-green-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <Icons.Shield size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-white font-medium">
                      {twoFactorEnabled ? '2FA Ativado' : '2FA Desativado'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {twoFactorEnabled
                        ? 'Sua conta está protegida'
                        : 'Adicione uma camada extra de segurança'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
                  className={clsx(
                    'px-4 py-2 rounded-xl transition text-sm font-medium',
                    twoFactorEnabled
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  )}
                >
                  {twoFactorEnabled ? 'Desativar' : 'Ativar'}
                </button>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 text-sm">
                  <Icons.Info className="inline mr-2 text-blue-400" size={14} />
                  Com 2FA ativo, você receberá um código por email sempre que fizer login.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
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
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none pr-10 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1"
                >
                  {showPasswords ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nova Senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirmar Nova Senha</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleChangePassword}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition flex items-center justify-center gap-2"
              >
                <Icons.Key size={16} />
                Alterar Senha
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Bell size={20} className="text-orange-400" />
            Notificações
          </h3>

          <div className="space-y-3">
            {[
              { key: 'email', label: 'Email', description: 'Receba atualizações por email' },
              { key: 'push', label: 'Push', description: 'Notificações no navegador' },
              { key: 'whatsapp', label: 'WhatsApp', description: 'Notificações via WhatsApp' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 sm:p-4 bg-gray-800/50 rounded-xl">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-white font-medium text-sm sm:text-base">{item.label}</p>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                  className={clsx(
                    'w-12 h-6 rounded-full transition relative flex-shrink-0',
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
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Settings size={20} className="text-orange-400" />
            Preferências
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Tema</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
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
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:outline-none text-base"
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icons.Info size={20} className="text-orange-400" />
            Informações da Conta
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between p-3 bg-gray-800/50 rounded-xl gap-1">
              <span className="text-gray-400">ID do Usuário</span>
              <span className="text-gray-300 font-mono text-xs sm:text-sm truncate">{currentUser?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-gray-400">Função</span>
              <span className="text-orange-400 font-medium capitalize">{currentUser?.role || 'Membro'}</span>
            </div>
            <div className="flex justify-between p-3 bg-gray-800/50 rounded-xl">
              <span className="text-gray-400">2FA</span>
              <span className={twoFactorEnabled ? 'text-green-400' : 'text-gray-500'}>
                {twoFactorEnabled ? 'Ativado' : 'Desativado'}
              </span>
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
