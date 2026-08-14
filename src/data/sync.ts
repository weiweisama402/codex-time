import type { RealtimeChannel } from '@supabase/supabase-js';
import { db, tableFor } from './db';
import { supabase } from './supabase';
import type { EntityType, OutboxMutation, SyncConflict, SyncedEntity } from '../types';
import { decideRemoteMerge } from '../lib/syncPolicy';

interface RemoteEntity {
  id: string;
  user_id: string;
  entity_type: EntityType;
  payload: Record<string, unknown>;
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

let syncing = false;
let realtimeChannel: RealtimeChannel | null = null;

function hydrateRemote(row: RemoteEntity): SyncedEntity {
  return {
    ...row.payload,
    id: row.id,
    userId: row.user_id,
    version: row.version,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } as SyncedEntity;
}

async function recordConflict(mutation: OutboxMutation, remote: RemoteEntity): Promise<void> {
  const conflict: SyncConflict = {
    id: crypto.randomUUID(),
    userId: mutation.userId,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    localPayload: mutation.payload,
    remotePayload: remote.payload,
    remoteVersion: remote.version,
    createdAt: new Date().toISOString()
  };
  await db.transaction('rw', db.conflicts, db.outbox, async () => {
    await db.conflicts.put(conflict);
    if (mutation.seq) await db.outbox.delete(mutation.seq);
  });
}

async function fetchRemote(id: string): Promise<RemoteEntity | null> {
  const { data, error } = await supabase!.from('entities').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as RemoteEntity | null;
}

async function pushMutation(mutation: OutboxMutation): Promise<void> {
  const values = {
    id: mutation.entityId,
    user_id: mutation.userId,
    entity_type: mutation.entityType,
    payload: mutation.payload,
    deleted_at: mutation.operation === 'delete' ? (mutation.payload.deletedAt as string) : null
  };
  let row: RemoteEntity | null = null;
  if (mutation.baseVersion === 0) {
    const { data, error } = await supabase!
      .from('entities')
      .insert({ ...values, version: 1 })
      .select()
      .maybeSingle();
    if (error) {
      if (error.code === '23505') {
        const remote = await fetchRemote(mutation.entityId);
        if (remote) return recordConflict(mutation, remote);
      }
      throw error;
    }
    row = data as RemoteEntity | null;
  } else {
    const { data, error } = await supabase!
      .from('entities')
      .update({ ...values, version: mutation.baseVersion + 1 })
      .eq('id', mutation.entityId)
      .eq('version', mutation.baseVersion)
      .select()
      .maybeSingle();
    if (error) throw error;
    row = data as RemoteEntity | null;
    if (!row) {
      const remote = await fetchRemote(mutation.entityId);
      if (remote) return recordConflict(mutation, remote);
    }
  }
  if (!row) return;
  const table = tableFor(mutation.entityType);
  const local = await table.get(mutation.entityId);
  await db.transaction('rw', table, db.outbox, async () => {
    if (local)
      await table.put({ ...local, version: row!.version, updatedAt: row!.updated_at } as SyncedEntity);
    if (mutation.seq) {
      const current = await db.outbox.get(mutation.seq);
      if (current?.payload.updatedAt === mutation.payload.updatedAt) await db.outbox.delete(mutation.seq);
      else if (current) await db.outbox.update(mutation.seq, { baseVersion: row!.version });
    }
  });
}

async function pullRemote(userId: string): Promise<void> {
  const metaKey = `sync:${userId}`;
  const cursor = (await db.meta.get(metaKey))?.value ?? '1970-01-01T00:00:00.000Z';
  const overlap = new Date(Math.max(0, Date.parse(cursor) - 120000)).toISOString();
  const { data, error } = await supabase!
    .from('entities')
    .select('*')
    .eq('user_id', userId)
    .gte('updated_at', overlap)
    .order('updated_at', { ascending: true })
    .limit(5000);
  if (error) throw error;
  let newest = cursor;
  for (const raw of data ?? []) {
    const row = raw as RemoteEntity;
    const table = tableFor(row.entity_type);
    const pending = await db.outbox.where('[entityType+entityId]').equals([row.entity_type, row.id]).first();
    const local = await table.get(row.id);
    const decision = decideRemoteMerge(row.version, local?.version ?? null, pending?.baseVersion ?? null);
    if (decision === 'apply') {
      await table.put(hydrateRemote(row));
    } else if (decision === 'conflict' && pending) {
      await recordConflict(pending, row);
    }
    if (row.updated_at > newest) newest = row.updated_at;
  }
  await db.meta.put({ key: metaKey, value: newest });
}

export async function syncNow(userId: string): Promise<void> {
  if (!supabase || syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const mutations = await db.outbox.where('userId').equals(userId).sortBy('createdAt');
    for (const mutation of mutations) {
      try {
        await pushMutation(mutation);
      } catch (error) {
        if (mutation.seq) await db.outbox.update(mutation.seq, { attempts: mutation.attempts + 1 });
        throw error;
      }
    }
    await pullRemote(userId);
  } finally {
    syncing = false;
  }
}

export function subscribeToRemote(userId: string, onChange: () => void): RealtimeChannel | null {
  if (!supabase) return null;
  if (realtimeChannel) void supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`entities:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'entities', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();
  return realtimeChannel;
}

export async function resolveConflict(conflict: SyncConflict, choice: 'local' | 'remote'): Promise<void> {
  const table = tableFor(conflict.entityType);
  if (choice === 'remote') {
    const remote = await fetchRemote(conflict.entityId);
    if (remote) await table.put(hydrateRemote(remote));
  } else {
    const local = { ...conflict.localPayload, version: conflict.remoteVersion } as unknown as SyncedEntity;
    await table.put(local);
    await db.outbox.add({
      userId: conflict.userId,
      entityType: conflict.entityType,
      entityId: conflict.entityId,
      operation: local.deletedAt ? 'delete' : 'upsert',
      baseVersion: conflict.remoteVersion,
      payload: conflict.localPayload,
      createdAt: new Date().toISOString(),
      attempts: 0
    });
  }
  await db.conflicts.delete(conflict.id);
}
