import { createClient } from '@supabase/supabase-js';
import { config } from './index.js';

// Cliente com service key (acesso total - usar apenas no backend)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Cliente com anon key (para operações com RLS)
export const supabaseAnon = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Função para verificar conexão
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

export default supabase;
