import { DEFAULT_SETTINGS } from '../constants';
import type { ActiveTimerV2, BackupV2, CategoryKey, TimeEntryV2 } from '../types';

export function makeEntry(overrides: Partial<TimeEntryV2> = {}): TimeEntryV2 {
  const now = '2026-08-14T08:00:00.000Z';
  return {
    id: crypto.randomUUID(),
    dateKey: '2026-08-14',
    title: '整理冲击试验数据',
    categoryKey: 'main',
    durationSeconds: 3600,
    startedAt: null,
    endedAt: null,
    note: '',
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides
  };
}

export function makeTimer(overrides: Partial<ActiveTimerV2> = {}): ActiveTimerV2 {
  return {
    id: 'active',
    title: 'VUMAT 编程',
    categoryKey: 'main' as CategoryKey,
    startedAt: '2026-08-14T08:00:00.000Z',
    runningSince: '2026-08-14T08:00:00.000Z',
    accumulatedSeconds: 0,
    status: 'running',
    updatedAt: '2026-08-14T08:00:00.000Z',
    ...overrides
  };
}

export function makeBackup(overrides: Partial<BackupV2> = {}): BackupV2 {
  return {
    schemaVersion: '2.0',
    revision: 0,
    deviceId: crypto.randomUUID(),
    exportedAt: '2026-08-14T08:00:00.000Z',
    entries: [makeEntry()],
    timer: null,
    settings: DEFAULT_SETTINGS(),
    ...overrides
  };
}
