import { db, tableFor } from './db';
import type { BaseEntity, EntityType, OutboxMutation, SyncedEntity } from '../types';

export function newBase(userId: string, id: string = crypto.randomUUID()): BaseEntity {
  const now = new Date().toISOString();
  return { id, userId, version: 0, createdAt: now, updatedAt: now, deletedAt: null };
}

function payloadOf(entity: SyncedEntity): Record<string, unknown> {
  return structuredClone(entity) as unknown as Record<string, unknown>;
}

export async function saveEntity<T extends SyncedEntity>(type: EntityType, entity: T): Promise<T> {
  const table = tableFor(type);
  const existingMutation = await db.outbox.where('[entityType+entityId]').equals([type, entity.id]).first();
  const existingEntity = await table.get(entity.id);
  const next = { ...entity, updatedAt: new Date().toISOString() } as T;
  const mutation: OutboxMutation = {
    userId: next.userId,
    entityType: type,
    entityId: next.id,
    operation: next.deletedAt ? 'delete' : 'upsert',
    baseVersion: existingMutation?.baseVersion ?? existingEntity?.version ?? 0,
    payload: payloadOf(next),
    createdAt: existingMutation?.createdAt ?? new Date().toISOString(),
    attempts: existingMutation?.attempts ?? 0
  };
  await db.transaction('rw', table, db.outbox, async () => {
    await table.put(next);
    if (existingMutation?.seq) await db.outbox.put({ ...mutation, seq: existingMutation.seq });
    else await db.outbox.add(mutation);
  });
  return next;
}

export async function softDelete(type: EntityType, id: string): Promise<void> {
  const table = tableFor(type);
  const entity = await table.get(id);
  if (!entity) return;
  const now = new Date().toISOString();
  await saveEntity(type, { ...entity, deletedAt: now, updatedAt: now } as SyncedEntity);
}

export async function restoreEntity(type: EntityType, id: string): Promise<void> {
  const table = tableFor(type);
  const entity = await table.get(id);
  if (!entity) return;
  await saveEntity(type, { ...entity, deletedAt: null, updatedAt: new Date().toISOString() } as SyncedEntity);
}

export async function purgeExpiredTrash(userId: string, days = 30): Promise<void> {
  const threshold = Date.now() - days * 86400000;
  for (const type of ['entry', 'project', 'task', 'tag', 'preset', 'plan', 'review'] as EntityType[]) {
    const table = tableFor(type);
    const values = await table.where('userId').equals(userId).toArray();
    const ids = values
      .filter((value) => value.deletedAt && Date.parse(value.deletedAt) < threshold)
      .map((value) => value.id);
    await table.bulkDelete(ids);
  }
}
