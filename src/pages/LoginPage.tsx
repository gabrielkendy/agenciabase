import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register';

// ============================================
// SISTEMA DE USUÁRIOS LOCAL (SEM SUPABASE)
// ============================================
const LOCAL_USERS_KEY = 'base_agency_users';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'editor' | 'client';
  createdAt: string;
}

// Admin padrão do sistema
const DEFAULT_ADMIN: LocalUser = {
  id: 'admin-001',
  name: 'Administrador',
  email: 'admin@base.ai',
  password: 'admin123',
  role: 'admin',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const getLocalUsers = (): LocalUser[] => {
  try {
    const stored = localStorage.getItem(LOCAL_USERS_KEY);
    if (!stored) return [DEFAULT_ADMIN];
    const users = JSON.parse(stored) as LocalUser[];
    // Garantir que admin padrão sempre existe
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

const createUser = (name: string, email: string, password: string, role: 'admin' | 'editor' | 'client' = 'editor'): LocalUser => {
  const users = getLocalUsers();
  const newUser: LocalUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: password,
    role: role,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  saveLocalUsers(users);
  return newUser;
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
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  });

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
  const handleLogin = async () => {
    const email = form.email.toLowerCase().trim();
    const password = form.password;

    if (!email || !password) {
      toast.error('Preencha email e senha');
      return;
    }

    // Modo local
    if (!isSupabaseConfigured()) {
      const user = findUserByEmail(email);
      
      if (user && user.password === password) {
        setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        });
        toast.success(`Bem-vindo, ${user.name}!`);
        navigate('/');
        return;
      }
      
      toast.error('Email ou senha incorretos');
      return;
    }

    // Supabase
    if (!supabase) {
      toast.error('Erro de configuração');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Email ou senha incorretos');
      return;
    }

    if (data.user) {
      setCurrentUser({
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
        role: data.user.user_metadata?.role || 'editor',
      });
      toast.success('Login realizado!');
      navigate('/');
    }
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

    // Modo local
    if (!isSupabaseConfigured()) {
      const existing = findUserByEmail(email);
      if (existing) {
        toast.error('Este email já está cadastrado');
        return;
      }

      const newUser = createUser(name, email, password);
      
      // Login automático
      setCurrentUser({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      });
      
      toast.success('Conta criada com sucesso!');
      navigate('/');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await handleLogin();
      } else if (mode === 'register') {
        await handleRegister();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl mb-4">
            <Icons.Zap className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white">BASE Agency</h1>
          <p className="text-gray-500 mt-2">Sistema de Gestão para Agências</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            {mode === 'login' && 'Entrar na sua conta'}
            {mode === 'register' && 'Criar nova conta'}
          </h2>

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
                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
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
                  className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Senha */}
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
                  className="w-full pl-11 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                >
                  {showPassword ? <Icons.EyeOff size={20} /> : <Icons.Eye size={20} />}
                </button>
              </div>
            </div>

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
                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icons.Loader className="animate-spin" size={20} />
              ) : (
                <>
                  {mode === 'login' && <><Icons.LogIn size={20} /> Entrar</>}
                  {mode === 'register' && <><Icons.UserPlus size={20} /> Criar conta</>}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
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
              <p className="text-gray-400">
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
            {mode === 'register' && (
              <p className="text-gray-400">
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-orange-500 hover:text-orange-400 font-medium transition"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 text-sm mt-6">
          © 2025 BASE Agency • agenciabase.tech
        </p>
      </div>
    </div>
  );
};
