import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify-email' | 'verify-2fa';

// ============================================
// SISTEMA DE USUÁRIOS LOCAL (COM 2FA)
// ============================================
const LOCAL_USERS_KEY = 'base_agency_users';
const VERIFICATION_CODES_KEY = 'base_agency_verification_codes';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'client' | 'super_admin';
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

interface VerificationCode {
  email: string;
  code: string;
  type: 'email-verification' | '2fa-login' | 'password-reset';
  expiresAt: number;
  attempts: number;
}

// Admin padrão do sistema
const DEFAULT_ADMIN: LocalUser = {
  id: 'admin-001',
  name: 'Administrador',
  email: 'admin@base.ai',
  password: 'admin123',
  role: 'super_admin',
  createdAt: '2025-01-01T00:00:00.000Z',
  emailVerified: true,
  twoFactorEnabled: false,
};

// ============================================
// FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS
// ============================================
const getLocalUsers = (): LocalUser[] => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    if (!stored) return [DEFAULT_ADMIN];
    const users = JSON.parse(stored) as LocalUser[];
    const hasAdmin = users.some(u => u.email.toLowerCase() === 'admin@base.ai');
    if (!hasAdmin) users.push(DEFAULT_ADMIN);
    return users;
  } catch {
    return [DEFAULT_ADMIN];
  }
};

const saveLocalUsers = (users: LocalUser[]) => {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const findUserByEmail = (email: string): LocalUser | undefined => {
  const users = getLocalUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
};

const updateUser = (email: string, updates: Partial<LocalUser>) => {
  const users = getLocalUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (index >= 0) {
    users[index] = { ...users[index], ...updates };
    saveLocalUsers(users);
  }
};

const createUser = (name: string, email: string, password: string, role: 'admin' | 'editor' | 'client' = 'editor'): LocalUser => {
  const users = getLocalUsers();
  const newUser: LocalUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    role: role,
    createdAt: new Date().toISOString(),
    emailVerified: false,
    twoFactorEnabled: false,
  };
  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
};

// ============================================
// FUNÇÕES DE CÓDIGO DE VERIFICAÇÃO
// ============================================
const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getVerificationCodes = (): VerificationCode[] => {
  try {
    const stored = localStorage.getItem(VERIFICATION_CODES_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as VerificationCode[];
  } catch {
    return [];
  }
};

const saveVerificationCode = (code: VerificationCode) => {
  const codes = getVerificationCodes().filter(c =>
    !(c.email === code.email && c.type === code.type)
  );
  codes.push(code);
  localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
};

const getActiveCode = (email: string, type: VerificationCode['type']): VerificationCode | null => {
  const codes = getVerificationCodes();
  const code = codes.find(c =>
    c.email.toLowerCase() === email.toLowerCase() &&
    c.type === type &&
    c.expiresAt > Date.now() &&
    c.attempts < 5
  );
  return code || null;
};

const validateCode = (email: string, inputCode: string, type: VerificationCode['type']): boolean => {
  const codes = getVerificationCodes();
  const codeIndex = codes.findIndex(c =>
    c.email.toLowerCase() === email.toLowerCase() &&
    c.type === type
  );

  if (codeIndex === -1) return false;

  const code = codes[codeIndex];

  // Expirado
  if (code.expiresAt < Date.now()) {
    codes.splice(codeIndex, 1);
    localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
    return false;
  }

  // Muitas tentativas
  if (code.attempts >= 5) {
    return false;
  }

  // Código correto
  if (code.code === inputCode) {
    codes.splice(codeIndex, 1);
    localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
    return true;
  }

  // Código incorreto - incrementar tentativas
  codes[codeIndex].attempts += 1;
  localStorage.setItem(VERIFICATION_CODES_KEY, JSON.stringify(codes));
  return false;
};

const sendVerificationEmail = async (email: string, code: string, type: string): Promise<boolean> => {
  // Simular envio de email (em produção, usar serviço real)
  console.log(`[EMAIL SIMULADO] Para: ${email}`);
  console.log(`[EMAIL SIMULADO] Código: ${code}`);
  console.log(`[EMAIL SIMULADO] Tipo: ${type}`);

  // Em produção, integrar com:
  // - Supabase Edge Functions + Resend/SendGrid
  // - Vercel API Routes + Resend/SendGrid
  // - AWS SES

  return true;
};

// ============================================
// COMPONENTE DE INPUT OTP
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

    // Auto-focus next input
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
    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
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
          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
          autoComplete="off"
        />
      ))}
    </div>
  );
};

// ============================================
// COMPONENTE DE LOGIN
// ============================================
export const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, currentUser } = useStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUser, setPendingUser] = useState<LocalUser | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // Check Supabase session
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            role: session.user.user_metadata?.role || 'editor',
          });
          navigate('/');
        }
      } catch (error) {
        console.log('Session check error:', error);
      }
    };
    checkSession();
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  const sendCode = async (email: string, type: VerificationCode['type']) => {
    const code = generateCode();
    const verificationCode: VerificationCode = {
      email: email.toLowerCase(),
      code,
      type,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutos
      attempts: 0,
    };
    saveVerificationCode(verificationCode);
    await sendVerificationEmail(email, code, type);
    setResendCooldown(60);
    return code;
  };

  const handleLogin = async () => {
    const email = form.email.toLowerCase().trim();
    const password = form.password;

    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    // SEMPRE verificar admin master primeiro
    if (email === 'admin@base.ai' && password === 'admin123') {
      setCurrentUser({
        id: 'admin-001',
        email: 'admin@base.ai',
        name: 'Administrador',
        role: 'super_admin',
      });
      toast.success('Bem-vindo, Administrador!');
      navigate('/');
      return;
    }

    // Verificar usuários locais
    const localUser = findUserByEmail(email);
    if (localUser && localUser.password === password) {
      // Verificar se email foi confirmado
      if (!localUser.emailVerified) {
        setPendingUser(localUser);
        await sendCode(email, 'email-verification');
        setMode('verify-email');
        toast('Verifique seu email para continuar', { icon: '📧' });
        return;
      }

      // Verificar se tem 2FA ativo
      if (localUser.twoFactorEnabled) {
        setPendingUser(localUser);
        await sendCode(email, '2fa-login');
        setMode('verify-2fa');
        toast('Código de verificação enviado!', { icon: '🔐' });
        return;
      }

      // Login direto
      setCurrentUser({
        id: localUser.id,
        email: localUser.email,
        name: localUser.name,
        role: localUser.role,
      });
      toast.success(`Bem-vindo, ${localUser.name}!`);
      navigate('/');
      return;
    }

    // Tentar Supabase se configurado
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        setCurrentUser({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
          role: data.user.user_metadata?.role || 'editor',
        });
        toast.success('Login realizado!');
        navigate('/');
        return;
      }
    }

    toast.error('Email ou senha incorretos');
  };

  const handleRegister = async () => {
    const name = form.name.trim();
    const email = form.email.toLowerCase().trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (!name) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!email) {
      toast.error('Email é obrigatório');
      return;
    }

    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Senhas não coincidem');
      return;
    }

    // Verificar se já existe
    const existing = findUserByEmail(email);
    if (existing) {
      toast.error('Este email já está cadastrado');
      return;
    }

    // Modo local com verificação de email
    if (!isSupabaseConfigured()) {
      const newUser = createUser(name, email, password);
      setPendingUser(newUser);

      // Enviar código de verificação
      const code = await sendCode(email, 'email-verification');
      console.log(`[DEBUG] Código de verificação: ${code}`);

      setMode('verify-email');
      toast.success('Código enviado! Verifique seu email.');
      return;
    }

    // Supabase
    if (!supabase) {
      toast.error('Erro de configuração');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: 'editor' } },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      toast.success('Conta criada! Verifique seu email.');
      setMode('login');
    }
  };

  const handleVerifyEmail = async () => {
    if (otpCode.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    if (!pendingUser) {
      toast.error('Erro: usuário não encontrado');
      setMode('login');
      return;
    }

    const isValid = validateCode(pendingUser.email, otpCode, 'email-verification');

    if (!isValid) {
      const activeCode = getActiveCode(pendingUser.email, 'email-verification');
      if (activeCode && activeCode.attempts >= 5) {
        toast.error('Muitas tentativas. Solicite um novo código.');
      } else {
        toast.error('Código inválido ou expirado');
      }
      return;
    }

    // Marcar email como verificado
    updateUser(pendingUser.email, { emailVerified: true });

    // Login automático
    setCurrentUser({
      id: pendingUser.id,
      email: pendingUser.email,
      name: pendingUser.name,
      role: pendingUser.role,
    });

    toast.success('Email verificado! Bem-vindo!');
    navigate('/');
  };

  const handleVerify2FA = async () => {
    if (otpCode.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    if (!pendingUser) {
      toast.error('Erro: usuário não encontrado');
      setMode('login');
      return;
    }

    const isValid = validateCode(pendingUser.email, otpCode, '2fa-login');

    if (!isValid) {
      const activeCode = getActiveCode(pendingUser.email, '2fa-login');
      if (activeCode && activeCode.attempts >= 5) {
        toast.error('Muitas tentativas. Tente fazer login novamente.');
        setMode('login');
        setOtpCode('');
      } else {
        toast.error('Código inválido ou expirado');
      }
      return;
    }

    // Login bem sucedido
    setCurrentUser({
      id: pendingUser.id,
      email: pendingUser.email,
      name: pendingUser.name,
      role: pendingUser.role,
    });

    toast.success(`Bem-vindo, ${pendingUser.name}!`);
    navigate('/');
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    if (!pendingUser) {
      toast.error('Erro: usuário não encontrado');
      return;
    }

    const type = mode === 'verify-email' ? 'email-verification' : '2fa-login';
    await sendCode(pendingUser.email, type);
    setOtpCode('');
    toast.success('Novo código enviado!');
  };

  const handleForgotPassword = async () => {
    const email = form.email.toLowerCase().trim();

    if (!email) {
      toast.error('Digite seu email');
      return;
    }

    // Modo local - não tem como enviar email real
    if (!isSupabaseConfigured()) {
      const user = findUserByEmail(email);
      if (!user) {
        toast.error('Email não encontrado');
        return;
      }

      // Enviar código de reset
      const code = await sendCode(email, 'password-reset');
      console.log(`[DEBUG] Código de reset: ${code}`);

      setEmailSent(true);
      toast.success('Código enviado! Verifique seu email.');
      return;
    }

    // Supabase
    if (!supabase) {
      toast.error('Erro de configuração');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        toast.error('Aguarde alguns minutos antes de tentar novamente');
      } else {
        toast.error('Erro ao enviar email. Verifique o endereço.');
      }
      return;
    }

    setEmailSent(true);
    toast.success('Email de recuperação enviado!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await handleLogin();
      } else if (mode === 'register') {
        await handleRegister();
      } else if (mode === 'forgot') {
        await handleForgotPassword();
      } else if (mode === 'verify-email') {
        await handleVerifyEmail();
      } else if (mode === 'verify-2fa') {
        await handleVerify2FA();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setMode('login');
    setEmailSent(false);
    setOtpCode('');
    setPendingUser(null);
  };

  // ============================================
  // RENDER - VERIFICAÇÃO DE EMAIL
  // ============================================
  if (mode === 'verify-email' || mode === 'verify-2fa') {
    const isEmailVerification = mode === 'verify-email';

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md px-4 sm:px-0">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl mb-4">
              <Icons.Shield className="text-white" size={28} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {isEmailVerification ? 'Verificar Email' : 'Autenticação 2FA'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm sm:text-base">
              {isEmailVerification
                ? 'Digite o código enviado para seu email'
                : 'Digite o código de segurança'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full mb-4">
                <Icons.Mail className="text-orange-500" size={16} />
                <span className="text-gray-300 text-sm truncate max-w-[200px]">
                  {pendingUser?.email}
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm">
                Código válido por 10 minutos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <OTPInput
                value={otpCode}
                onChange={setOtpCode}
              />

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Icons.Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    <Icons.Check size={20} />
                    Verificar Código
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center space-y-3">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="text-orange-500 hover:text-orange-400 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {resendCooldown > 0
                  ? `Reenviar em ${resendCooldown}s`
                  : 'Reenviar código'}
              </button>

              <div className="pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={resetToLogin}
                  className="text-gray-400 hover:text-white transition text-sm"
                >
                  Voltar para login
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info (remover em produção) */}
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <p className="text-yellow-500 text-xs text-center">
              <Icons.AlertTriangle className="inline mr-1" size={14} />
              Modo desenvolvimento: Verifique o console para o código
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-600 text-xs sm:text-sm mt-6">
            © 2025 BASE Agency • agenciabase.tech
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - LOGIN / REGISTER / FORGOT
  // ============================================
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4 sm:px-0">
        {/* Logo */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl mb-4">
            <Icons.Zap className="text-white" size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">BASE Agency</h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Sistema de Gestão para Agências</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-6 text-center">
            {mode === 'login' && 'Entrar na sua conta'}
            {mode === 'register' && 'Criar nova conta'}
            {mode === 'forgot' && 'Recuperar senha'}
          </h2>

          {/* Email enviado */}
          {mode === 'forgot' && emailSent ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Icons.Mail className="text-green-500" size={28} />
              </div>
              <h3 className="text-lg font-medium text-white">Email enviado!</h3>
              <p className="text-gray-400 text-sm">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <p className="text-gray-500 text-xs">
                Não recebeu? Verifique a pasta de spam ou aguarde alguns minutos.
              </p>
              <button
                type="button"
                onClick={resetToLogin}
                className="text-orange-500 hover:text-orange-400 font-medium transition"
              >
                Voltar para login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome (só cadastro) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome completo</label>
                  <div className="relative">
                    <Icons.User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Seu nome"
                      className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition text-base"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Icons.Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition text-base"
                  />
                </div>
              </div>

              {/* Instrução para recuperar senha */}
              {mode === 'forgot' && (
                <p className="text-gray-400 text-sm">
                  Digite seu email e enviaremos um link para você criar uma nova senha.
                </p>
              )}

              {/* Senha */}
              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Senha</label>
                  <div className="relative">
                    <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition p-1"
                    >
                      {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirmar Senha (só cadastro) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar senha</label>
                  <div className="relative">
                    <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition text-base"
                    />
                  </div>
                </div>
              )}

              {/* Esqueci senha link */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-orange-500 hover:text-orange-400 transition"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2 min-h-[48px]"
              >
                {loading ? (
                  <Icons.Loader className="animate-spin" size={20} />
                ) : (
                  <>
                    {mode === 'login' && <><Icons.LogIn size={20} /> Entrar</>}
                    {mode === 'register' && <><Icons.UserPlus size={20} /> Criar conta</>}
                    {mode === 'forgot' && <><Icons.Mail size={20} /> Enviar link</>}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Divider */}
          {!(mode === 'forgot' && emailSent) && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-500">ou</span>
                </div>
              </div>

              {/* Toggle Mode */}
              <div className="text-center">
                {mode === 'login' && (
                  <p className="text-gray-400 text-sm sm:text-base">
                    Não tem conta?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('register')}
                      className="text-orange-500 hover:text-orange-400 font-medium transition"
                    >
                      Criar agora
                    </button>
                  </p>
                )}
                {(mode === 'register' || mode === 'forgot') && (
                  <p className="text-gray-400 text-sm sm:text-base">
                    Já tem conta?{' '}
                    <button
                      type="button"
                      onClick={resetToLogin}
                      className="text-orange-500 hover:text-orange-400 font-medium transition"
                    >
                      Fazer login
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Security Badge */}
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-500 text-xs">
          <Icons.Shield size={14} />
          <span>Protegido com verificação em 2 etapas</span>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-xs sm:text-sm mt-4">
          © 2025 BASE Agency • agenciabase.tech
        </p>
      </div>
    </div>
  );
};
