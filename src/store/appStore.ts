import { create } from 'zustand';
import { RESEARCH_PROJECTS } from '../constants';
import { allForUser, db, tableFor } from '../data/db';
import { newBase, purgeExpiredTrash, restoreEntity, saveEntity, softDelete } from '../data/repository';
import { resolveConflict as resolveSyncConflict, subscribeToRemote, syncNow } from '../data/sync';
import { cloudConfigured } from '../data/supabase';
import { activeTimerSeconds } from '../lib/duration';
import { dateKey, periodStart, todayKey } from '../lib/date';
import { parseBackup } from '../lib/validation';
import type {
  ActiveTimer,
  BackupV1,
  CategoryKey,
  Plan,
  Project,
  Review,
  SyncConflict,
  Tag,
  Task,
  TimeEntry,
  TimerPreset,
  UserSettings
} from '../types';

export interface EntryDraft {
  id?: string;
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
}

export interface TimerDraft {
  categoryKey: CategoryKey;
  projectId: string | null;
  taskId: string | null;
  tagIds: string[];
  title: string;
  note?: string;
}

interface AppState {
  userId: string | null;
  hydrated: boolean;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  entries: TimeEntry[];
  timer: ActiveTimer | null;
  presets: TimerPreset[];
  plans: Plan[];
  reviews: Review[];
  settings: UserSettings | null;
  conflicts: SyncConflict[];
  syncStatus: 'local' | 'idle' | 'syncing' | 'offline' | 'error';
  syncError: string | null;
  initialize: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  runSync: () => Promise<void>;
  completeOnboarding: (withResearchTemplate: boolean) => Promise<void>;
  addProject: (
    input: Pick<Project, 'name' | 'categoryKey' | 'color'> & Partial<Pick<Project, 'description'>>
  ) => Promise<Project>;
  addTask: (projectId: string, name: string) => Promise<Task>;
  addTag: (name: string, color: string) => Promise<Tag>;
  addPreset: (input: Omit<TimerDraft, 'note'> & { name: string; color: string }) => Promise<TimerPreset>;
  saveEntry: (draft: EntryDraft) => Promise<TimeEntry>;
  deleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  startTimer: (draft: TimerDraft) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<TimeEntry | null>;
  savePlan: (
    input: Pick<Plan, 'periodType' | 'periodStart' | 'scopeType' | 'scopeId' | 'targetSeconds' | 'note'>
  ) => Promise<void>;
  saveReview: (
    input: Pick<Review, 'periodType' | 'periodStart' | 'wins' | 'issues' | 'adjustments'>
  ) => Promise<void>;
  updateSettings: (
    input: Partial<Pick<UserSettings, 'theme' | 'timezone' | 'timerWarningMinutes'>>
  ) => Promise<void>;
  exportBackup: () => Promise<string>;
  importBackup: (value: unknown) => Promise<void>;
  resolveConflict: (conflict: SyncConflict, choice: 'local' | 'remote') => Promise<void>;
}

function applyTheme(theme: UserSettings['theme']): void {
  document.documentElement.dataset.theme = theme;
}

function defaultSettings(userId: string): UserSettings {
  return {
    ...newBase(userId, userId),
    theme: 'system',
    timezone: 'Asia/Shanghai',
    weekStartsOn: 1,
    timerWarningMinutes: 240,
    onboardingComplete: false,
    lastBackupAt: null
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  userId: null,
  hydrated: false,
  projects: [],
  tasks: [],
  tags: [],
  entries: [],
  timer: null,
  presets: [],
  plans: [],
  reviews: [],
  settings: null,
  conflicts: [],
  syncStatus: 'local',
  syncError: null,

  initialize: async (userId) => {
    set({ userId, hydrated: false });
    await purgeExpiredTrash(userId);
    if (cloudConfigured && navigator.onLine) {
      try {
        await syncNow(userId);
      } catch {
        /* Local data remains available if the first pull fails. */
      }
    }
    let settings = (await allForUser(db.settings, userId))[0] ?? null;
    if (!settings) settings = await saveEntity('settings', defaultSettings(userId));
    applyTheme(settings.theme);
    await get().refresh();
    set({ hydrated: true });
    if (navigator.storage?.persist) void navigator.storage.persist();
    void get().runSync();
    const channel = subscribeToRemote(userId, () => void get().runSync());
    if (channel) window.addEventListener('beforeunload', () => void channel.unsubscribe(), { once: true });
  },

  refresh: async () => {
    const userId = get().userId;
    if (!userId) return;
    const [projects, tasks, tags, entries, timers, presets, plans, reviews, settings, conflicts] =
      await Promise.all([
        allForUser(db.projects, userId),
        allForUser(db.tasks, userId),
        allForUser(db.tags, userId),
        allForUser(db.entries, userId),
        allForUser(db.timers, userId),
        allForUser(db.presets, userId),
        allForUser(db.plans, userId),
        allForUser(db.reviews, userId),
        allForUser(db.settings, userId),
        allForUser(db.conflicts, userId)
      ]);
    set({
      projects: projects.sort((a, b) => a.sortOrder - b.sortOrder),
      tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder),
      tags,
      entries,
      timer: timers.find((timer) => !timer.deletedAt) ?? null,
      presets: presets.filter((preset) => !preset.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder),
      plans,
      reviews,
      settings: settings[0] ?? null,
      conflicts
    });
  },

  runSync: async () => {
    const userId = get().userId;
    if (!userId) return;
    if (!navigator.onLine) {
      set({ syncStatus: 'offline' });
      return;
    }
    set({ syncStatus: 'syncing', syncError: null });
    try {
      await syncNow(userId);
      await get().refresh();
      const pending = await db.outbox.where('userId').equals(userId).count();
      set({ syncStatus: pending ? 'local' : 'idle' });
    } catch (error) {
      set({ syncStatus: 'error', syncError: error instanceof Error ? error.message : '同步失败' });
    }
  },

  completeOnboarding: async (withResearchTemplate) => {
    const { userId, settings } = get();
    if (!userId || !settings) return;
    if (withResearchTemplate && get().projects.filter((project) => !project.deletedAt).length === 0) {
      for (const [index, input] of RESEARCH_PROJECTS.entries()) {
        const project = await saveEntity<Project>('project', {
          ...newBase(userId),
          ...input,
          description: '',
          sortOrder: index,
          archivedAt: null
        });
        if (index < 5) {
          await saveEntity<TimerPreset>('preset', {
            ...newBase(userId),
            name: input.name,
            title: input.name,
            categoryKey: input.categoryKey,
            projectId: project.id,
            taskId: null,
            tagIds: [],
            color: input.color,
            sortOrder: index
          });
        }
      }
    }
    await saveEntity<UserSettings>('settings', { ...settings, onboardingComplete: true });
    await get().refresh();
    void get().runSync();
  },

  addProject: async (input) => {
    const userId = get().userId!;
    const project = await saveEntity<Project>('project', {
      ...newBase(userId),
      ...input,
      description: input.description ?? '',
      sortOrder: get().projects.length,
      archivedAt: null
    });
    await get().refresh();
    void get().runSync();
    return project;
  },

  addTask: async (projectId, name) => {
    const userId = get().userId!;
    const task = await saveEntity<Task>('task', {
      ...newBase(userId),
      projectId,
      name,
      sortOrder: get().tasks.filter((item) => item.projectId === projectId).length,
      archivedAt: null
    });
    await get().refresh();
    void get().runSync();
    return task;
  },

  addTag: async (name, color) => {
    const tag = await saveEntity<Tag>('tag', { ...newBase(get().userId!), name, color });
    await get().refresh();
    void get().runSync();
    return tag;
  },

  addPreset: async (input) => {
    const preset = await saveEntity<TimerPreset>('preset', {
      ...newBase(get().userId!),
      ...input,
      tagIds: input.tagIds,
      sortOrder: get().presets.length
    });
    await get().refresh();
    void get().runSync();
    return preset;
  },

  saveEntry: async (draft) => {
    const existing = draft.id ? get().entries.find((entry) => entry.id === draft.id) : undefined;
    const entry = await saveEntity<TimeEntry>('entry', {
      ...(existing ?? newBase(get().userId!)),
      ...draft,
      id: existing?.id ?? draft.id ?? crypto.randomUUID(),
      title: draft.title.trim(),
      note: draft.note.trim(),
      source: existing?.source ?? 'manual',
      deletedAt: null
    });
    await get().refresh();
    void get().runSync();
    return entry;
  },

  deleteEntry: async (id) => {
    await softDelete('entry', id);
    await get().refresh();
    void get().runSync();
  },

  restoreEntry: async (id) => {
    await restoreEntity('entry', id);
    await get().refresh();
    void get().runSync();
  },

  startTimer: async (draft) => {
    if (get().timer) throw new Error('已有计时正在进行');
    const userId = get().userId!;
    const existing = await db.timers.get(userId);
    const now = new Date().toISOString();
    await saveEntity<ActiveTimer>('timer', {
      ...(existing ?? newBase(userId, userId)),
      ...draft,
      id: userId,
      note: draft.note ?? '',
      startedAt: now,
      runningSince: now,
      accumulatedSeconds: 0,
      status: 'running',
      deletedAt: null
    });
    await get().refresh();
    void get().runSync();
  },

  pauseTimer: async () => {
    const timer = get().timer;
    if (!timer || timer.status !== 'running') return;
    await saveEntity<ActiveTimer>('timer', {
      ...timer,
      accumulatedSeconds: activeTimerSeconds(timer),
      runningSince: null,
      status: 'paused'
    });
    await get().refresh();
    void get().runSync();
  },

  resumeTimer: async () => {
    const timer = get().timer;
    if (!timer || timer.status !== 'paused') return;
    await saveEntity<ActiveTimer>('timer', {
      ...timer,
      runningSince: new Date().toISOString(),
      status: 'running'
    });
    await get().refresh();
    void get().runSync();
  },

  stopTimer: async () => {
    const timer = get().timer;
    const settings = get().settings;
    if (!timer || !settings) return null;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(1, activeTimerSeconds(timer));
    const entry = await saveEntity<TimeEntry>('entry', {
      ...newBase(timer.userId),
      dateKey: dateKey(new Date(timer.startedAt), settings.timezone),
      startedAt: timer.startedAt,
      endedAt,
      durationSeconds,
      categoryKey: timer.categoryKey,
      projectId: timer.projectId,
      taskId: timer.taskId,
      tagIds: timer.tagIds,
      title: timer.title,
      note: timer.note,
      source: 'timer'
    });
    await saveEntity<ActiveTimer>('timer', { ...timer, deletedAt: endedAt, updatedAt: endedAt });
    await get().refresh();
    void get().runSync();
    return entry;
  },

  savePlan: async (input) => {
    const existing = get().plans.find(
      (plan) =>
        !plan.deletedAt &&
        plan.periodType === input.periodType &&
        plan.periodStart === input.periodStart &&
        plan.scopeType === input.scopeType &&
        plan.scopeId === input.scopeId
    );
    await saveEntity<Plan>('plan', { ...(existing ?? newBase(get().userId!)), ...input, deletedAt: null });
    await get().refresh();
    void get().runSync();
  },

  saveReview: async (input) => {
    const normalized = { ...input, periodStart: periodStart(input.periodType, input.periodStart) };
    const existing = get().reviews.find(
      (review) =>
        !review.deletedAt &&
        review.periodType === normalized.periodType &&
        review.periodStart === normalized.periodStart
    );
    await saveEntity<Review>('review', {
      ...(existing ?? newBase(get().userId!)),
      ...normalized,
      deletedAt: null
    });
    await get().refresh();
    void get().runSync();
  },

  updateSettings: async (input) => {
    const settings = get().settings;
    if (!settings) return;
    const next = await saveEntity<UserSettings>('settings', { ...settings, ...input });
    applyTheme(next.theme);
    await get().refresh();
    void get().runSync();
  },

  exportBackup: async () => {
    const state = get();
    const backup: BackupV1 = {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      projects: state.projects,
      tasks: state.tasks,
      tags: state.tags,
      entries: state.entries,
      presets: state.presets,
      plans: state.plans,
      reviews: state.reviews,
      settings: state.settings
    };
    if (state.settings)
      await saveEntity<UserSettings>('settings', { ...state.settings, lastBackupAt: backup.exportedAt });
    await get().refresh();
    return JSON.stringify(backup, null, 2);
  },

  importBackup: async (value) => {
    const parsed = parseBackup(value);
    const userId = get().userId!;
    const now = new Date().toISOString();
    const remap = <T extends { userId: string; version: number; updatedAt: string }>(items: T[]) =>
      items.map((item) => ({ ...item, userId, version: 0, updatedAt: now }));
    const projects = remap(parsed.projects);
    const tasks = remap(parsed.tasks);
    const tags = remap(parsed.tags);
    const entries = remap(parsed.entries).map((entry) => ({ ...entry, source: 'import' as const }));
    const presets = remap(parsed.presets);
    const plans = remap(parsed.plans);
    const reviews = remap(parsed.reviews);
    const settings = parsed.settings
      ? { ...parsed.settings, id: userId, userId, version: 0, updatedAt: now }
      : defaultSettings(userId);
    await db.transaction(
      'rw',
      [db.projects, db.tasks, db.tags, db.entries, db.presets, db.plans, db.reviews, db.settings, db.outbox],
      async () => {
        for (const table of [
          db.projects,
          db.tasks,
          db.tags,
          db.entries,
          db.presets,
          db.plans,
          db.reviews,
          db.settings
        ]) {
          const ids = (await table.where('userId').equals(userId).primaryKeys()) as string[];
          await table.bulkDelete(ids);
        }
        await db.outbox.where('userId').equals(userId).delete();
        await db.projects.bulkPut(projects);
        await db.tasks.bulkPut(tasks);
        await db.tags.bulkPut(tags);
        await db.entries.bulkPut(entries);
        await db.presets.bulkPut(presets);
        await db.plans.bulkPut(plans);
        await db.reviews.bulkPut(reviews);
        await db.settings.put(settings);
        for (const [type, items] of [
          ['project', projects],
          ['task', tasks],
          ['tag', tags],
          ['entry', entries],
          ['preset', presets],
          ['plan', plans],
          ['review', reviews],
          ['settings', [settings]]
        ] as const) {
          await db.outbox.bulkAdd(
            items.map((item) => ({
              userId,
              entityType: type,
              entityId: item.id,
              operation: item.deletedAt ? 'delete' : 'upsert',
              baseVersion: 0,
              payload: structuredClone(item) as Record<string, unknown>,
              createdAt: now,
              attempts: 0
            }))
          );
        }
      }
    );
    await get().refresh();
    void get().runSync();
  },

  resolveConflict: async (conflict, choice) => {
    await resolveSyncConflict(conflict, choice);
    await get().refresh();
    void get().runSync();
  }
}));

export function activeTodayEntries(entries: TimeEntry[], timezone = 'Asia/Shanghai'): TimeEntry[] {
  const today = todayKey(timezone);
  return entries.filter((entry) => !entry.deletedAt && entry.dateKey === today);
}

export function entityTableForTests(type: Parameters<typeof tableFor>[0]) {
  return tableFor(type);
}
