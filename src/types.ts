export type CategoryKey = 'main' | 'extra' | 'leisure' | 'fun';

export interface TimeEntryV2 {
  id: string;
  dateKey: string;
  title: string;
  categoryKey: CategoryKey;
  durationSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  note: string;
  source: 'timer' | 'manual' | 'duplicate';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ActiveTimerV2 {
  id: 'active';
  title: string;
  categoryKey: CategoryKey;
  startedAt: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  status: 'running' | 'paused';
  updatedAt: string;
}

export interface MobileSettingsV2 {
  id: 'settings';
  theme: 'system' | 'light' | 'dark';
  timezone: string;
  weekStartsOn: 1;
  timerWarningMinutes: number;
  updatedAt: string;
}

export interface BackupV2 {
  schemaVersion: '2.0';
  revision: number;
  deviceId: string;
  exportedAt: string;
  entries: TimeEntryV2[];
  timer: ActiveTimerV2 | null;
  settings: MobileSettingsV2;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export interface CloudBackupRow {
  user_id: string;
  payload: BackupV2;
  revision: number;
  created_at: string;
  updated_at: string;
}

export type BackupStatus = 'local' | 'pending' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

export interface CloudConflict {
  reason: 'restore' | 'diverged';
  remote: BackupV2;
}

export interface DeletedEntryUndo {
  entryId: string;
  title: string;
  expiresAt: number;
}
