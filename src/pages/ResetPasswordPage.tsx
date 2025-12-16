import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Icons } from '../components/Icons';
import toast from 'react-hot-toast';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
  });

  // Verificar se tem sessão válida do link de recuperação
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        setChecking(false);
        return;
      }

      try {
        // Pegar o hash da URL (Supabase coloca tokens lá)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (type === 'recovery' && accessToken) {
          // Definir a sessão com o token de recuperação
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (error) {
            console.error('Session error:', error);
            toast.error('Link inválido ou expirado');
            setIsValidSession(false);
          } else if (data.session) {
            setIsValidSession(true);
          }
        } else {
          // Verificar sessão existente
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setIsValidSession(true);
          }
        }
      } catch (error) {
        console.error('Check session error:', error);
      } finally {
        setChecking(false);
      }
    };

    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { password, confirmPassword } = form;

    if (password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Senhas não coincidem');
      return;
    }

    if (!isSupabaseConfigured() || !supabase) {
      toast.error('Sistema não configurado para recuperação de senha');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message.includes('same as')) {
          toast.error('A nova senha deve ser diferente da anterior');
        } else {
          toast.error('Erro ao atualizar senha. Tente novamente.');
        }
        return;
      }

      toast.success('Senha atualizada com sucesso!');
      
      // Fazer logout e redirecionar para login
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Icons.Loader className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  // Link inválido ou expirado
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md text-center">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icons.AlertTriangle className="text-red-500" size={32} />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Link inválido ou expirado</h2>
            <p className="text-gray-400 mb-6">
              Este link de recuperação não é válido ou já expirou. Solicite um novo link.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
            >
              <Icons.ArrowLeft size={20} />
              Voltar para login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulário de nova senha
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
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
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icons.Key className="text-orange-500" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-white">Criar nova senha</h2>
            <p className="text-gray-400 text-sm mt-2">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Nova Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Nova senha</label>
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

            {/* Confirmar Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Confirmar nova senha</label>
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

            {/* Requisitos de senha */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Requisitos da senha:</p>
              <div className="space-y-1">
                <div className={`flex items-center gap-2 text-xs ${form.password.length >= 6 ? 'text-green-500' : 'text-gray-500'}`}>
                  {form.password.length >= 6 ? <Icons.Check size={14} /> : <Icons.X size={14} />}
                  Mínimo 6 caracteres
                </div>
                <div className={`flex items-center gap-2 text-xs ${form.password && form.password === form.confirmPassword ? 'text-green-500' : 'text-gray-500'}`}>
                  {form.password && form.password === form.confirmPassword ? <Icons.Check size={14} /> : <Icons.X size={14} />}
                  Senhas coincidem
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || form.password.length < 6 || form.password !== form.confirmPassword}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <Icons.Loader className="animate-spin" size={20} />
              ) : (
                <>
                  <Icons.Check size={20} />
                  Atualizar senha
                </>
              )}
            </button>
          </form>

          {/* Voltar */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-gray-400 hover:text-white text-sm transition flex items-center justify-center gap-1 mx-auto"
            >
              <Icons.ArrowLeft size={16} />
              Voltar para login
            </button>
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
