import { DEFAULT_SETTINGS, SOFT_DELETE_RETENTION_DAYS } from '../constants';
import { parseBackup } from '../lib/backup';
import { db } from './db';
import type { ActiveTimerV2, BackupV2, MobileSettingsV2, TimeEntryV2 } from '../types';

const RETENTION_MS = SOFT_DELETE_RETENTION_DAYS * 86_400_000;

export interface LocalSnapshot {
  entries: TimeEntryV2[];
  timer: ActiveTimerV2 | null;
  settings: MobileSettingsV2;
  deviceId: string;
  cloudRevision: number;
  dirty: boolean;
}

export async function loadLocalSnapshot(now = Date.now()): Promise<LocalSnapshot> {
  await db.transaction('rw', db.entries, db.settings, db.meta, async () => {
    await db.entries
      .where('deletedAt')
      .below(new Date(now - RETENTION_MS).toISOString())
      .delete();
    if (!(await db.settings.get('settings'))) await db.settings.put(DEFAULT_SETTINGS());
    if (!(await db.meta.get('deviceId'))) await db.meta.put({ key: 'deviceId', value: crypto.randomUUID() });
  });
  const [entries, timer, settings, deviceId, cloudRevision, dirty] = await Promise.all([
    db.entries.toArray(),
    db.timers.get('active'),
    db.settings.get('settings'),
    db.meta.get('deviceId'),
    db.meta.get('cloudRevision'),
    db.meta.get('dirty')
  ]);
  return {
    entries,
    timer: timer ?? null,
    settings: settings ?? DEFAULT_SETTINGS(),
    deviceId: deviceId!.value,
    cloudRevision: Number(cloudRevision?.value ?? 0),
    dirty: dirty?.value === 'true'
  };
}

export async function setEntries(entries: TimeEntryV2[], dirty = true): Promise<void> {
  await db.transaction('rw', db.entries, db.meta, async () => {
    await db.entries.bulkPut(entries);
    if (dirty) await markDirty();
  });
}

export async function setTimer(timer: ActiveTimerV2 | null, dirty = true): Promise<void> {
  await db.transaction('rw', db.timers, db.meta, async () => {
    if (timer) await db.timers.put(timer);
    else await db.timers.delete('active');
    if (dirty) await markDirty();
  });
}

export async function finishTimer(entries: TimeEntryV2[]): Promise<void> {
  await db.transaction('rw', db.entries, db.timers, db.meta, async () => {
    await db.entries.bulkPut(entries);
    await db.timers.delete('active');
    await markDirty();
  });
}

export async function setSettings(settings: MobileSettingsV2, dirty = true): Promise<void> {
  await db.transaction('rw', db.settings, db.meta, async () => {
    await db.settings.put(settings);
    if (dirty) await markDirty();
  });
}

export async function markDirty(): Promise<void> {
  await db.meta.put({ key: 'dirty', value: 'true' });
}

export async function setCloudMeta(revision: number, dirty: boolean): Promise<void> {
  await db.meta.bulkPut([
    { key: 'cloudRevision', value: String(revision) },
    { key: 'dirty', value: String(dirty) }
  ]);
}

export function buildBackup(snapshot: LocalSnapshot, revision = snapshot.cloudRevision): BackupV2 {
  return {
    schemaVersion: '2.0',
    revision,
    deviceId: snapshot.deviceId,
    exportedAt: new Date().toISOString(),
    entries: snapshot.entries,
    timer: snapshot.timer,
    settings: snapshot.settings
  };
}

export async function replaceFromBackup(value: unknown, cloudRevision?: number): Promise<BackupV2> {
  const backup = parseBackup(value);
  await db.transaction('rw', db.entries, db.timers, db.settings, db.meta, async () => {
    await db.entries.clear();
    await db.timers.clear();
    await db.entries.bulkAdd(backup.entries);
    if (backup.timer) await db.timers.add(backup.timer);
    await db.settings.put(backup.settings);
    await db.meta.bulkPut([
      { key: 'cloudRevision', value: String(cloudRevision ?? backup.revision) },
      { key: 'dirty', value: 'false' }
    ]);
    if (!(await db.meta.get('deviceId'))) await db.meta.put({ key: 'deviceId', value: crypto.randomUUID() });
  });
  return backup;
}
