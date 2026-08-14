export type CategoryKey = 'main' | 'extra' | 'leisure' | 'fun';
export type EntityType =
  'project' | 'task' | 'tag' | 'entry' | 'timer' | 'preset' | 'plan' | 'review' | 'settings';

export interface BaseEntity {
  id: string;
  userId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Project extends BaseEntity {
  name: string;
  categoryKey: CategoryKey;
  color: string;
  description: string;
  sortOrder: number;
  archivedAt: string | null;
}

export interface Task extends BaseEntity {
  projectId: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
}

export interface Tag extends BaseEntity {
  name: string;
  color: string;
}

export interface TimeEntry extends BaseEntity {
  dateKey: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number;
  categoryKey: CategoryKey;
  projectId: string | null;
  taskId: string | null;
  tagIds: string[];
  title: string;
  note: string;
  source: 'timer' | 'manual' | 'import';
}

export interface ActiveTimer extends BaseEntity {
  categoryKey: CategoryKey;
  projectId: string | null;
  taskId: string | null;
  tagIds: string[];
  title: string;
  note: string;
  startedAt: string;
  runningSince: string | null;
  accumulatedSeconds: number;
  status: 'running' | 'paused';
}

export interface TimerPreset extends BaseEntity {
  name: string;
  categoryKey: CategoryKey;
  projectId: string | null;
  taskId: string | null;
  tagIds: string[];
  title: string;
  color: string;
  sortOrder: number;
}

export type PeriodType = 'day' | 'week' | 'month' | 'year';

export interface Plan extends BaseEntity {
  periodType: Exclude<PeriodType, 'day'>;
  periodStart: string;
  scopeType: 'category' | 'project';
  scopeId: string;
  targetSeconds: number;
  note: string;
}

export interface Review extends BaseEntity {
  periodType: PeriodType;
  periodStart: string;
  wins: string;
  issues: string;
  adjustments: string;
}

export interface UserSettings extends BaseEntity {
  theme: 'system' | 'light' | 'dark';
  timezone: string;
  weekStartsOn: 1;
  timerWarningMinutes: number;
  onboardingComplete: boolean;
  lastBackupAt: string | null;
}

export interface OutboxMutation {
  seq?: number;
  userId: string;
  entityType: EntityType;
  entityId: string;
  operation: 'upsert' | 'delete';
  baseVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

export interface SyncConflict {
  id: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  localPayload: Record<string, unknown>;
  remotePayload: Record<string, unknown>;
  remoteVersion: number;
  createdAt: string;
}

export interface MetaRecord {
  key: string;
  value: string;
}

export interface BackupV1 {
  schemaVersion: '1.0';
  exportedAt: string;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  entries: TimeEntry[];
  presets: TimerPreset[];
  plans: Plan[];
  reviews: Review[];
  settings: UserSettings | null;
}

export type SyncedEntity =
  Project | Task | Tag | TimeEntry | ActiveTimer | TimerPreset | Plan | Review | UserSettings;
