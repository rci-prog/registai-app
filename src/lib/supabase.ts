import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cmfgirvgnexkcomhcosm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Dm-ozWvAve1nkgjEDg_QsA_-gldlMxk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'RegistAI@www.registai.com.br',
    },
  },
});

export async function checkWhitelist(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('whitelist')
      .select('email')
      .eq('email', email)
      .single();
    if (error || !data) return false;
    return true;
  } catch {
    return false;
  }
}

export async function getProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  avatar_url?: string;
  theme?: 'light' | 'dark';
}) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
