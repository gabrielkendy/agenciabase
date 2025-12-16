import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store';
import { Icons } from '../components/Icons';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'forgot';

// Armazenar usuários localmente (modo sem Supabase)
const LOCAL_USERS_KEY = 'base_agency_users';

interface LocalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
}

const getLocalUsers = (): LocalUser[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveLocalUser = (user: LocalUser) => {
  const users = getLocalUsers();
  users.push(user);
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const findLocalUser = (email: string): LocalUser | undefined => {
  const users = getLocalUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase());
};

const updateLocalUserPassword = (email: string, newPassword: string) => {
  const users = getLocalUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (userIndex >= 0) {
    users[userIndex].password = newPassword;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    return true;
  }
  return false;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser, currentUser, teamMembers } = useStore();
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

  // Check for existing Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userData = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            role: session.user.user_metadata?.role || 'editor',
          };
          setCurrentUser(userData);
          navigate('/');
        }
      } catch (error) {
        console.log('Session check error:', error);
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ===== MODO LOCAL (sem Supabase) =====
      if (!isSupabaseConfigured()) {
        
        // ----- LOGIN -----
        if (mode === 'login') {
          const emailLower = form.email.toLowerCase().trim();
          const password = form.password;
          
          // 1. Buscar usuário local
          const localUser = findLocalUser(emailLower);
          
          if (localUser && localUser.password === password) {
            setCurrentUser({
              id: localUser.id,
              email: localUser.email,
              name: localUser.name,
              role: localUser.role as 'admin' | 'editor' | 'client',
            });
            toast.success(`Bem-vindo, ${localUser.name}!`);
            navigate('/');
            setLoading(false);
            return;
          }
          
          // 2. Verificar membro da equipe com senha padrão (email antes do @)
          const member = teamMembers.find(m => 
            m.email.toLowerCase() === emailLower
          );
          
          if (member) {
            const defaultPassword = emailLower.split('@')[0];
            if (password === defaultPassword) {
              // Criar usuário local para próximos logins
              const newUser: LocalUser = {
                id: member.id,
                name: member.name,
                email: member.email,
                password: password,
                role: member.role === 'manager' ? 'admin' : 'editor',
                createdAt: new Date().toISOString(),
              };
              saveLocalUser(newUser);
              
              setCurrentUser({
                id: member.id,
                email: member.email,
                name: member.name,
                role: member.role === 'manager' ? 'admin' : 'editor',
              });
              toast.success(`Bem-vindo, ${member.name}!`);
              navigate('/');
              setLoading(false);
              return;
            }
          }
          
          toast.error('Email ou senha incorretos');
          setLoading(false);
          return;
        }
        
        // ----- CADASTRO LOCAL -----
        else if (mode === 'register') {
          const emailLower = form.email.toLowerCase().trim();
          const name = form.name.trim();
          const password = form.password;
          const confirmPassword = form.confirmPassword;
          
          if (!name) {
            toast.error('Nome é obrigatório');
            setLoading(false);
            return;
          }
          
          if (password !== confirmPassword) {
            toast.error('Senhas não coincidem');
            setLoading(false);
            return;
          }

          if (password.length < 6) {
            toast.error('Senha deve ter no mínimo 6 caracteres');
            setLoading(false);
            return;
          }
          
          // Verificar se email já existe
          const existingUser = findLocalUser(emailLower);
          if (existingUser) {
            toast.error('Este email já está cadastrado');
            setLoading(false);
            return;
          }
          
          // Criar novo usuário
          const newUser: LocalUser = {
            id: `user_${Date.now()}`,
            name: name,
            email: emailLower,
            password: password,
            role: 'editor',
            createdAt: new Date().toISOString(),
          };
          
          saveLocalUser(newUser);
          
          // Fazer login automático
          setCurrentUser({
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: 'editor',
          });
          
          toast.success('Conta criada com sucesso!');
          navigate('/');
          setLoading(false);
          return;
        }
        
        // ----- ESQUECI SENHA -----
        else if (mode === 'forgot') {
          const emailLower = form.email.toLowerCase().trim();
          const user = findLocalUser(emailLower);
          
          if (user) {
            // Gerar nova senha temporária
            const tempPassword = Math.random().toString(36).slice(-8);
            updateLocalUserPassword(emailLower, tempPassword);
            
            toast.success(`Sua nova senha temporária é: ${tempPassword}`, {
              duration: 10000,
            });
            toast('Anote essa senha! Você pode alterá-la depois.', {
              duration: 8000,
              icon: '📝',
            });
          } else {
            toast.error('Email não encontrado');
          }
          
          setLoading(false);
          return;
        }
      }

      // ===== LOGIN COM SUPABASE =====
      if (mode === 'login') {
        if (!supabase) throw new Error('Supabase não configurado');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });

        if (error) throw error;

        if (data.user) {
          setCurrentUser({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
            role: data.user.user_metadata?.role || 'editor',
          });
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      } 
      // ===== CADASTRO COM SUPABASE =====
      else if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          toast.error('Senhas não coincidem');
          setLoading(false);
          return;
        }

        if (form.password.length < 6) {
          toast.error('Senha deve ter no mínimo 6 caracteres');
          setLoading(false);
          return;
        }

        if (!supabase) throw new Error('Supabase não configurado');
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              role: 'editor',
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          toast.success('Conta criada! Verifique seu email para confirmar.');
          setMode('login');
        }
      }
      // ===== ESQUECI SENHA COM SUPABASE =====
      else if (mode === 'forgot') {
        if (!supabase) throw new Error('Supabase não configurado');
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) throw error;

        toast.success('Email de recuperação enviado!');
        setMode('login');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message?.includes('Invalid login')) {
        toast.error('Email ou senha incorretos');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Confirme seu email antes de fazer login');
      } else {
        toast.error(error.message || 'Erro ao processar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background Effects */}
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
            {mode === 'forgot' && 'Recuperar senha'}
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
                    required
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
                    minLength={6}
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
                    minLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
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

            {/* Submit Button */}
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
                  {mode === 'forgot' && <><Icons.Mail size={20} /> Recuperar</>}
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
                  onClick={() => setMode('register')}
                  className="text-orange-500 hover:text-orange-400 font-medium transition"
                >
                  Criar agora
                </button>
              </p>
            )}
            {(mode === 'register' || mode === 'forgot') && (
              <p className="text-gray-400">
                Já tem conta?{' '}
                <button
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
