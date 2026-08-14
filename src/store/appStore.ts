import { create } from 'zustand';
import { CLOUD_BACKUP_DEBOUNCE_MS, DEFAULT_SETTINGS, UNDO_SECONDS } from '../constants';
import {
  buildBackup,
  finishTimer,
  loadLocalSnapshot,
  markDirty,
  replaceFromBackup,
  setCloudMeta,
  setEntries,
  setSettings,
  setTimer
} from '../data/repository';
import { parseBackup, decideCloudAction } from '../lib/backup';
import { splitTimerByDate } from '../lib/date';
import { activeTimerSeconds } from '../lib/duration';
import type {
  ActiveTimerV2,
  BackupStatus,
  BackupV2,
  CategoryKey,
  CloudConflict,
  DeletedEntryUndo,
  MobileSettingsV2,
  TimeEntryV2
} from '../types';

type SessionSummary = { userId: string; email: string };
type CloudModule = typeof import('../data/cloud');
type EntryInput = {
  id?: string;
  dateKey: string;
  title: string;
  categoryKey: CategoryKey;
  minutes: number;
  note: string;
};

interface AppState {
  hydrated: boolean;
  entries: TimeEntryV2[];
  timer: ActiveTimerV2 | null;
  settings: MobileSettingsV2;
  deviceId: string;
  cloudRevision: number;
  dirty: boolean;
  session: SessionSummary | null;
  backupStatus: BackupStatus;
  cloudConflict: CloudConflict | null;
  undo: DeletedEntryUndo | null;
  notice: string;
  initialize: () => Promise<void>;
  startTimer: (title: string, categoryKey: CategoryKey) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: () => Promise<void>;
  saveEntry: (input: EntryInput) => Promise<void>;
  duplicateEntry: (entry: TimeEntryV2) => Promise<void>;
  deleteEntry: (entry: TimeEntryV2) => Promise<void>;
  undoDelete: () => Promise<void>;
  updateSettings: (
    patch: Partial<Pick<MobileSettingsV2, 'theme' | 'timezone' | 'timerWarningMinutes'>>
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  syncCloud: () => Promise<void>;
  resolveCloudConflict: (choice: 'restore' | 'replace') => Promise<void>;
  exportBackup: () => Promise<BackupV2>;
  importBackup: (value: unknown) => Promise<void>;
  clearNotice: () => void;
}

let backupTimer: number | undefined;
let undoTimer: number | undefined;

function applyTheme(theme: MobileSettingsV2['theme']) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function sessionSummary(session: Awaited<ReturnType<CloudModule['currentSession']>>): SessionSummary | null {
  return session ? { userId: session.user.id, email: session.user.email ?? '' } : null;
}

function friendlyError(error: unknown): string {
  const detail = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (detail.includes('invalid login credentials')) return '邮箱或密码不正确';
  if (detail.includes('failed to fetch') || detail.includes('network')) return '网络连接失败，请稍后重试';
  if (detail.includes('mobile_backups')) return '云备份服务尚未就绪';
  return error instanceof Error && /[\u4e00-\u9fff]/.test(error.message)
    ? error.message
    : '操作失败，请稍后重试';
}

function queueCloudBackup() {
  window.clearTimeout(backupTimer);
  backupTimer = window.setTimeout(() => void useAppStore.getState().syncCloud(), CLOUD_BACKUP_DEBOUNCE_MS);
}

async function refreshLocalState() {
  const snapshot = await loadLocalSnapshot();
  applyTheme(snapshot.settings.theme);
  useAppStore.setState({
    entries: snapshot.entries,
    timer: snapshot.timer,
    settings: snapshot.settings,
    deviceId: snapshot.deviceId,
    cloudRevision: snapshot.cloudRevision,
    dirty: snapshot.dirty
  });
  return snapshot;
}

function mutationComplete(patch: Partial<AppState>) {
  useAppStore.setState({ ...patch, dirty: true, backupStatus: navigator.onLine ? 'pending' : 'offline' });
  queueCloudBackup();
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  entries: [],
  timer: null,
  settings: DEFAULT_SETTINGS(),
  deviceId: '',
  cloudRevision: 0,
  dirty: false,
  session: null,
  backupStatus: 'local',
  cloudConflict: null,
  undo: null,
  notice: '',

  initialize: async () => {
    const snapshot = await refreshLocalState();
    set({
      hydrated: true,
      backupStatus: 'local'
    });
    void import('../data/cloud').then(async ({ cloudConfigured, currentSession, supabase }) => {
      if (!cloudConfigured) return;
      try {
        const session = await currentSession();
        set({
          session: sessionSummary(session),
          backupStatus: session ? (snapshot.dirty ? 'pending' : 'syncing') : 'local'
        });
        if (session) void get().syncCloud();
      } catch {
        // Local usage must remain available when Auth is unreachable.
      }
      supabase?.auth.onAuthStateChange((_event, nextSession) => {
        set({ session: sessionSummary(nextSession), backupStatus: nextSession ? 'pending' : 'local' });
      });
    });
  },

  startTimer: async (title, categoryKey) => {
    if (get().timer) throw new Error('已有进行中的计时');
    const now = new Date().toISOString();
    const timer: ActiveTimerV2 = {
      id: 'active',
      title: title.trim() || '未命名活动',
      categoryKey,
      startedAt: now,
      runningSince: now,
      accumulatedSeconds: 0,
      status: 'running',
      updatedAt: now
    };
    await setTimer(timer);
    mutationComplete({ timer });
  },

  pauseTimer: async () => {
    const timer = get().timer;
    if (!timer || timer.status !== 'running') return;
    const next: ActiveTimerV2 = {
      ...timer,
      accumulatedSeconds: activeTimerSeconds(timer),
      runningSince: null,
      status: 'paused',
      updatedAt: new Date().toISOString()
    };
    await setTimer(next);
    mutationComplete({ timer: next });
  },

  resumeTimer: async () => {
    const timer = get().timer;
    if (!timer || timer.status !== 'paused') return;
    const now = new Date().toISOString();
    const next: ActiveTimerV2 = { ...timer, runningSince: now, status: 'running', updatedAt: now };
    await setTimer(next);
    mutationComplete({ timer: next });
  },

  stopTimer: async () => {
    const timer = get().timer;
    if (!timer) return;
    const endedAt = new Date().toISOString();
    const segments = splitTimerByDate(timer, endedAt, get().settings.timezone);
    const createdAt = endedAt;
    const entries = segments.map<TimeEntryV2>((segment) => ({
      id: crypto.randomUUID(),
      ...segment,
      title: timer.title,
      categoryKey: timer.categoryKey,
      note: '',
      source: 'timer',
      createdAt,
      updatedAt: createdAt,
      deletedAt: null
    }));
    await finishTimer(entries);
    mutationComplete({ entries: [...get().entries, ...entries], timer: null, notice: '计时已保存' });
  },

  saveEntry: async (input) => {
    const seconds = Math.round(input.minutes * 60);
    if (
      !input.dateKey ||
      !input.title.trim() ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      seconds > 604800
    )
      throw new Error('请填写有效的活动和时长');
    const existing = input.id ? get().entries.find((entry) => entry.id === input.id) : undefined;
    const now = new Date().toISOString();
    const entry: TimeEntryV2 = {
      id: existing?.id ?? crypto.randomUUID(),
      dateKey: input.dateKey,
      title: input.title.trim(),
      categoryKey: input.categoryKey,
      durationSeconds: seconds,
      startedAt: existing?.startedAt ?? null,
      endedAt: existing?.endedAt ?? null,
      note: input.note.trim(),
      source: existing?.source ?? 'manual',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null
    };
    await setEntries([entry]);
    const entries = existing
      ? get().entries.map((item) => (item.id === entry.id ? entry : item))
      : [...get().entries, entry];
    mutationComplete({ entries, notice: existing ? '记录已更新' : '记录已添加' });
  },

  duplicateEntry: async (entry) => {
    const now = new Date().toISOString();
    const copy: TimeEntryV2 = {
      ...entry,
      id: crypto.randomUUID(),
      source: 'duplicate',
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    };
    await setEntries([copy]);
    mutationComplete({ entries: [...get().entries, copy], notice: '已复制记录' });
  },

  deleteEntry: async (entry) => {
    const now = new Date().toISOString();
    const deleted = { ...entry, deletedAt: now, updatedAt: now };
    await setEntries([deleted]);
    window.clearTimeout(undoTimer);
    const undo = { entryId: entry.id, title: entry.title, expiresAt: Date.now() + UNDO_SECONDS * 1000 };
    undoTimer = window.setTimeout(() => set({ undo: null }), UNDO_SECONDS * 1000);
    mutationComplete({
      entries: get().entries.map((item) => (item.id === entry.id ? deleted : item)),
      undo,
      notice: ''
    });
  },

  undoDelete: async () => {
    const undo = get().undo;
    if (!undo) return;
    const entry = get().entries.find((item) => item.id === undo.entryId);
    if (!entry) return;
    const restored = { ...entry, deletedAt: null, updatedAt: new Date().toISOString() };
    await setEntries([restored]);
    window.clearTimeout(undoTimer);
    mutationComplete({
      entries: get().entries.map((item) => (item.id === restored.id ? restored : item)),
      undo: null,
      notice: '删除已撤销'
    });
  },

  updateSettings: async (patch) => {
    const normalized = { ...patch };
    if (normalized.timerWarningMinutes !== undefined) {
      normalized.timerWarningMinutes = Math.min(
        1440,
        Math.max(15, Math.round(normalized.timerWarningMinutes || 180))
      );
    }
    const settings = { ...get().settings, ...normalized, updatedAt: new Date().toISOString() };
    await setSettings(settings);
    applyTheme(settings.theme);
    mutationComplete({ settings, notice: '设置已保存' });
  },

  login: async (email, password) => {
    set({ backupStatus: 'syncing', notice: '' });
    try {
      const { signInWithPassword } = await import('../data/cloud');
      const session = await signInWithPassword(email, password);
      set({ session: sessionSummary(session), backupStatus: 'pending' });
      await get().syncCloud();
    } catch (error) {
      set({ backupStatus: 'error', notice: friendlyError(error) });
      throw error;
    }
  },

  logout: async () => {
    const { signOutCloud } = await import('../data/cloud');
    await signOutCloud();
    set({
      session: null,
      backupStatus: 'local',
      cloudConflict: null,
      notice: '已退出云备份，本地记录仍保留'
    });
  },

  syncCloud: async () => {
    const session = get().session;
    if (!session) {
      set({ backupStatus: 'local' });
      return;
    }
    if (!navigator.onLine) {
      set({ backupStatus: 'offline' });
      return;
    }
    if (get().cloudConflict) return;
    set({ backupStatus: 'syncing' });
    try {
      const { fetchCloudBackup, insertCloudBackup, updateCloudBackup } = await import('../data/cloud');
      const snapshot = await loadLocalSnapshot();
      const remote = await fetchCloudBackup(session.userId);
      if (!remote) {
        const backup = buildBackup(snapshot, 1);
        await insertCloudBackup(session.userId, backup);
        await setCloudMeta(1, false);
        set({ cloudRevision: 1, dirty: false, backupStatus: 'synced' });
        return;
      }

      const action = decideCloudAction(snapshot.cloudRevision, remote.revision, snapshot.dirty);
      if (action === 'restore' || action === 'conflict') {
        set({
          cloudConflict: { reason: action === 'restore' ? 'restore' : 'diverged', remote: remote.payload },
          backupStatus: 'conflict'
        });
        return;
      }
      if (action === 'idle') {
        await setCloudMeta(remote.revision, false);
        set({ cloudRevision: remote.revision, dirty: false, backupStatus: 'synced' });
        return;
      }

      const backup = buildBackup(snapshot, remote.revision + 1);
      const updated = await updateCloudBackup(session.userId, backup, remote.revision);
      if (!updated) {
        const latest = await fetchCloudBackup(session.userId);
        if (!latest) throw new Error('云备份状态异常');
        set({ cloudConflict: { reason: 'diverged', remote: latest.payload }, backupStatus: 'conflict' });
        return;
      }
      await setCloudMeta(updated.revision, false);
      set({ cloudRevision: updated.revision, dirty: false, backupStatus: 'synced' });
    } catch (error) {
      set({ backupStatus: 'error', notice: friendlyError(error) });
    }
  },

  resolveCloudConflict: async (choice) => {
    const conflict = get().cloudConflict;
    const session = get().session;
    if (!conflict || !session) return;
    set({ backupStatus: 'syncing' });
    try {
      const { updateCloudBackup } = await import('../data/cloud');
      if (choice === 'restore') {
        await replaceFromBackup(conflict.remote, conflict.remote.revision);
        await refreshLocalState();
        set({ cloudConflict: null, backupStatus: 'synced', notice: '已恢复云端备份' });
        return;
      }
      const snapshot = await loadLocalSnapshot();
      const backup = buildBackup(snapshot, conflict.remote.revision + 1);
      const updated = await updateCloudBackup(session.userId, backup, conflict.remote.revision, true);
      if (!updated) throw new Error('替换云端备份失败');
      await setCloudMeta(updated.revision, false);
      set({
        cloudRevision: updated.revision,
        dirty: false,
        cloudConflict: null,
        backupStatus: 'synced',
        notice: '已用本机数据替换云端备份'
      });
    } catch (error) {
      set({ backupStatus: 'error', notice: friendlyError(error) });
    }
  },

  exportBackup: async () => buildBackup(await loadLocalSnapshot()),

  importBackup: async (value) => {
    const backup = parseBackup(value);
    await replaceFromBackup(backup, get().cloudRevision);
    await markDirty();
    await refreshLocalState();
    set({ dirty: true, backupStatus: get().session ? 'pending' : 'local', notice: '备份已导入' });
    queueCloudBackup();
  },

  clearNotice: () => set({ notice: '' })
}));
