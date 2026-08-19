import { CATEGORIES } from '../constants';
import { enumerateDates } from './date';
import type { CategoryKey, TimeEntryV2 } from '../types';

export function activeEntries(entries: TimeEntryV2[]): TimeEntryV2[] {
  return entries.filter((entry) => !entry.deletedAt);
}

export function entriesInRange(entries: TimeEntryV2[], start: string, end: string): TimeEntryV2[] {
  return activeEntries(entries).filter((entry) => entry.dateKey >= start && entry.dateKey <= end);
}

export function totals(entries: TimeEntryV2[]) {
  const byCategory = Object.fromEntries(CATEGORIES.map((item) => [item.key, 0])) as Record<
    CategoryKey,
    number
  >;
  for (const entry of activeEntries(entries)) byCategory[entry.categoryKey] += entry.durationSeconds;
  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  const effective = byCategory.main + byCategory.extra;
  return { total, effective, byCategory, effectiveRate: total ? Math.round((effective / total) * 100) : 0 };
}

export function dailySeries(entries: TimeEntryV2[], start: string, end: string) {
  return enumerateDates(start, end).map((date) => {
    const day = totals(entries.filter((entry) => entry.dateKey === date));
    return { date, ...day };
  });
}
