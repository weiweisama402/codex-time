import { z } from 'zod';
import type { BackupV2 } from '../types';

const category = z.enum(['main', 'extra', 'leisure', 'fun']);
const iso = z.string().datetime();
const timezone = z
  .string()
  .min(1)
  .max(80)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('zh-CN', { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid timezone' }
  );
const entry = z.object({
  id: z.string().uuid(),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().min(1).max(120),
  categoryKey: category,
  durationSeconds: z.number().int().positive().max(604800),
  startedAt: iso.nullable(),
  endedAt: iso.nullable(),
  note: z.string().max(1000),
  source: z.enum(['timer', 'manual', 'duplicate']),
  createdAt: iso,
  updatedAt: iso,
  deletedAt: iso.nullable()
});
const timer = z.object({
  id: z.literal('active'),
  title: z.string().min(1).max(120),
  categoryKey: category,
  startedAt: iso,
  runningSince: iso.nullable(),
  accumulatedSeconds: z.number().int().nonnegative(),
  status: z.enum(['running', 'paused']),
  updatedAt: iso
});
const settings = z.object({
  id: z.literal('settings'),
  theme: z.enum(['system', 'light', 'dark']),
  timezone,
  weekStartsOn: z.literal(1),
  timerWarningMinutes: z.number().int().min(15).max(1440),
  updatedAt: iso
});
const backup = z.object({
  schemaVersion: z.literal('2.0'),
  revision: z.number().int().nonnegative(),
  deviceId: z.string().uuid(),
  exportedAt: iso,
  entries: z.array(entry).max(200000),
  timer: timer.nullable(),
  settings
});

export function parseBackup(value: unknown): BackupV2 {
  if (value && typeof value === 'object' && 'schemaVersion' in value) {
    const version = String((value as { schemaVersion: unknown }).schemaVersion);
    if (!version.startsWith('2.')) throw new Error('不支持的备份主版本');
  }
  const result = backup.safeParse(value);
  if (!result.success) throw new Error('备份文件格式不正确');
  return result.data;
}

export function decideCloudAction(localRevision: number, remoteRevision: number, dirty: boolean) {
  if (remoteRevision === localRevision) return dirty ? 'upload' : 'idle';
  if (!dirty && remoteRevision > localRevision) return 'restore';
  return 'conflict';
}
