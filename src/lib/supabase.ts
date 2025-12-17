import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Criar cliente dummy se não configurado para evitar erros
const createSupabaseClient = (): SupabaseClient<Database> | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('⚠️ Supabase não configurado - usando modo local');
    return null;
  }
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabase);
};

// Auth helpers
export const signUp = async (email: string, password: string, metadata?: { name?: string }) => {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
};

export const signIn = async (email: string, password: string) => {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase.auth.signInWithPassword({ email, password });
};

export const signOut = async () => {
  if (!supabase) throw new Error('Supabase não configurado');
  return supabase.auth.signOut();
};

export const getSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const getUser = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
};
