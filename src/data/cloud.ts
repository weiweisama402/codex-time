import { createClient, type Session } from '@supabase/supabase-js';
import { parseBackup } from '../lib/backup';
import type { BackupV2, CloudBackupRow } from '../types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const cloudConfigured = Boolean(url && publishableKey && !url?.includes('your-project'));
export const supabase = cloudConfigured
  ? createClient(url!, publishableKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    })
  : null;

export async function currentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  if (!supabase) throw new Error('云备份尚未配置');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });
  if (error) throw error;
  if (!data.session) throw new Error('登录失败');
  return data.session;
}

export async function signOutCloud(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchCloudBackup(userId: string): Promise<CloudBackupRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mobile_backups')
    .select('user_id,payload,revision,created_at,updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as CloudBackupRow), payload: parseBackup(data.payload) };
}

export async function insertCloudBackup(userId: string, backup: BackupV2): Promise<CloudBackupRow> {
  if (!supabase) throw new Error('云备份尚未配置');
  const { data, error } = await supabase
    .from('mobile_backups')
    .insert({ user_id: userId, payload: backup, revision: backup.revision })
    .select('user_id,payload,revision,created_at,updated_at')
    .single();
  if (error) throw error;
  return { ...(data as CloudBackupRow), payload: parseBackup(data.payload) };
}

export async function updateCloudBackup(
  userId: string,
  backup: BackupV2,
  expectedRevision: number,
  force = false
): Promise<CloudBackupRow | null> {
  if (!supabase) throw new Error('云备份尚未配置');
  let query = supabase
    .from('mobile_backups')
    .update({ payload: backup, revision: backup.revision })
    .eq('user_id', userId);
  if (!force) query = query.eq('revision', expectedRevision);
  const { data, error } = await query.select('user_id,payload,revision,created_at,updated_at').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as CloudBackupRow), payload: parseBackup(data.payload) };
}
