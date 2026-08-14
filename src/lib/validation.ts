import { z } from 'zod';

const category = z.enum(['main', 'extra', 'leisure', 'fun']);
const base = {
  id: z.string().uuid(),
  userId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable()
};

const project = z.object({
  ...base,
  name: z.string().min(1).max(80),
  categoryKey: category,
  color: z.string(),
  description: z.string(),
  sortOrder: z.number(),
  archivedAt: z.string().nullable()
});

const task = z.object({
  ...base,
  projectId: z.string().uuid(),
  name: z.string().min(1),
  sortOrder: z.number(),
  archivedAt: z.string().nullable()
});
const tag = z.object({ ...base, name: z.string().min(1), color: z.string() });
const entry = z.object({
  ...base,
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  durationSeconds: z.number().int().positive(),
  categoryKey: category,
  projectId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  tagIds: z.array(z.string().uuid()),
  title: z.string().min(1).max(120),
  note: z.string().max(1000),
  source: z.enum(['timer', 'manual', 'import'])
});
const preset = z.object({
  ...base,
  name: z.string().min(1),
  categoryKey: category,
  projectId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  tagIds: z.array(z.string().uuid()),
  title: z.string(),
  color: z.string(),
  sortOrder: z.number()
});
const plan = z.object({
  ...base,
  periodType: z.enum(['week', 'month', 'year']),
  periodStart: z.string(),
  scopeType: z.enum(['category', 'project']),
  scopeId: z.string(),
  targetSeconds: z.number().positive(),
  note: z.string()
});
const review = z.object({
  ...base,
  periodType: z.enum(['day', 'week', 'month', 'year']),
  periodStart: z.string(),
  wins: z.string(),
  issues: z.string(),
  adjustments: z.string()
});
const settings = z.object({
  ...base,
  theme: z.enum(['system', 'light', 'dark']),
  timezone: z.string(),
  weekStartsOn: z.literal(1),
  timerWarningMinutes: z.number().int().positive(),
  onboardingComplete: z.boolean(),
  lastBackupAt: z.string().nullable()
});

export const backupSchema = z.object({
  schemaVersion: z.literal('1.0'),
  exportedAt: z.string(),
  projects: z.array(project),
  tasks: z.array(task),
  tags: z.array(tag),
  entries: z.array(entry),
  presets: z.array(preset),
  plans: z.array(plan),
  reviews: z.array(review),
  settings: settings.nullable()
});

export function parseBackup(input: unknown) {
  return backupSchema.parse(input);
}
