import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile, Tenant, Plan, UserRole } from '../types/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  plan: Plan | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSupabaseEnabled: boolean;
  role: UserRole | null;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, tenantName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;

  // Role checks
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  canManageTenant: boolean;
  canManageTeam: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isSupabaseEnabled = isSupabaseConfigured();

  // Carregar dados do usuário
  const loadUserData = async (userId: string) => {
    if (!supabase) return;

    try {
      // Buscar profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single() as { data: Profile | null };

      if (profileData) {
        setProfile(profileData);

        // Buscar tenant se existir
        if (profileData.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*, plans(*)')
            .eq('id', profileData.tenant_id)
            .single() as { data: (Tenant & { plans?: Plan }) | null };

          if (tenantData) {
            setTenant(tenantData);
            if (tenantData.plans) {
              setPlan(tenantData.plans);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  // Inicializar auth
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      }
      setLoading(false);
    });

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setProfile(null);
          setTenant(null);
          setPlan(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sign In
  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase não configurado') };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  // Sign Up com criação de tenant
  const signUp = async (email: string, password: string, name: string, tenantName?: string) => {
    if (!supabase) return { error: new Error('Supabase não configurado') };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) return { error: error as Error };

    // Se criou usuário, criar tenant e profile
    if (data.user) {
      try {
        // Buscar plano free
        const { data: freePlan } = await supabase
          .from('plans')
          .select('id')
          .eq('slug', 'free')
          .single() as { data: { id: string } | null };

        // Criar tenant
        const tenantSlug = (tenantName || name).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const tenantResult = await supabase
          .from('tenants')
          .insert({
            name: tenantName || `${name}'s Agency`,
            slug: `${tenantSlug}-${Date.now()}`,
            plan_id: freePlan?.id || null,
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
            settings: {}
          } as any)
          .select()
          .single();

        if (tenantResult.error) throw tenantResult.error;
        const newTenant = tenantResult.data as Tenant | null;

        // Criar profile
        const profileResult = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            tenant_id: newTenant?.id,
            name,
            email,
            role: 'admin', // Criador é admin do tenant
            is_active: true
          } as any);

        if (profileResult.error) throw profileResult.error;

      } catch (setupError) {
        console.error('Erro ao configurar conta:', setupError);
        // Não retornar erro pois o usuário foi criado
      }
    }

    return { error: null };
  };

  // Sign Out
  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
    setPlan(null);
    setSession(null);
  };

  // Update Profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!supabase || !user) return { error: new Error('Não autenticado') };

    const client = supabase as any;
    const result = await client
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!result.error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error: result.error as Error | null };
  };

  // Role checks
  const role = profile?.role || null;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isManager = role === 'manager' || isAdmin;
  const canManageTenant = isAdmin;
  const canManageTeam = isManager;

  const value: AuthContextType = {
    user,
    profile,
    tenant,
    plan,
    session,
    loading,
    isAuthenticated: !!user,
    isSupabaseEnabled,
    role,
    signIn,
    signUp,
    signOut,
    updateProfile,
    isSuperAdmin,
    isAdmin,
    isManager,
    canManageTenant,
    canManageTeam,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
