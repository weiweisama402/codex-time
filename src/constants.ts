import type { CategoryKey, MobileSettingsV2 } from './types';

export const CATEGORIES: Array<{ key: CategoryKey; label: string; shortLabel: string; color: string }> = [
  { key: 'main', label: '主要工作', shortLabel: '主要', color: '#356d9c' },
  { key: 'extra', label: '附加工作', shortLabel: '附加', color: '#4e9a9a' },
  { key: 'leisure', label: '休闲', shortLabel: '休闲', color: '#be8a3b' },
  { key: 'fun', label: '娱乐', shortLabel: '娱乐', color: '#9a6ea8' }
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((item) => [item.key, item])) as Record<
  CategoryKey,
  (typeof CATEGORIES)[number]
>;

export const DEFAULT_SETTINGS = (): MobileSettingsV2 => ({
  id: 'settings',
  theme: 'system',
  timezone: 'Asia/Shanghai',
  weekStartsOn: 1,
  timerWarningMinutes: 180,
  updatedAt: new Date().toISOString()
});

export const UNDO_SECONDS = 10;
export const SOFT_DELETE_RETENTION_DAYS = 30;
export const CLOUD_BACKUP_DEBOUNCE_MS = 5000;
