import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar cliente dummy se não configurado para evitar erros
const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ Supabase não configurado - usando modo local');
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
};
