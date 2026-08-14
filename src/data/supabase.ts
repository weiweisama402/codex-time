import { createClient, type Session } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const cloudConfigured = Boolean(url && anonKey && !url?.includes('your-project'));
export const supabase = cloudConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

export async function currentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requestEmailCode(email: string): Promise<void> {
  if (!supabase) throw new Error('尚未配置 Supabase');
  const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo }
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string): Promise<Session> {
  if (!supabase) throw new Error('尚未配置 Supabase');
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
  if (!data.session) throw new Error('验证码已过期，请重新获取');
  return data.session;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
