import { CATEGORIES } from '../constants';
import type { CategoryKey, TimeEntry } from '../types';
import { enumerateDates } from './date';

export interface Totals {
  total: number;
  effective: number;
  byCategory: Record<CategoryKey, number>;
  activeDays: number;
}

export function activeEntries(entries: TimeEntry[]): TimeEntry[] {
  return entries.filter((entry) => !entry.deletedAt);
}

export function entriesInRange(entries: TimeEntry[], start: string, end: string): TimeEntry[] {
  return activeEntries(entries).filter((entry) => entry.dateKey >= start && entry.dateKey <= end);
}

export function totals(entries: TimeEntry[]): Totals {
  const byCategory: Record<CategoryKey, number> = { main: 0, extra: 0, leisure: 0, fun: 0 };
  const days = new Set<string>();
  for (const entry of activeEntries(entries)) {
    byCategory[entry.categoryKey] += entry.durationSeconds;
    days.add(entry.dateKey);
  }
  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  return { total, effective: byCategory.main + byCategory.extra, byCategory, activeDays: days.size };
}

export function dailySeries(entries: TimeEntry[], start: string, end: string) {
  return enumerateDates(start, end).map((day) => {
    const dayTotals = totals(entries.filter((entry) => entry.dateKey === day));
    return {
      date: day,
      ...Object.fromEntries(CATEGORIES.map((category) => [category.key, dayTotals.byCategory[category.key]])),
      total: dayTotals.total,
      effective: dayTotals.effective
    } as { date: string; total: number; effective: number } & Record<CategoryKey, number>;
  });
}

export function hasOverlap(candidate: TimeEntry, entries: TimeEntry[]): boolean {
  if (!candidate.startedAt || !candidate.endedAt || candidate.deletedAt) return false;
  const start = Date.parse(candidate.startedAt);
  const end = Date.parse(candidate.endedAt);
  return activeEntries(entries).some((entry) => {
    if (entry.id === candidate.id || !entry.startedAt || !entry.endedAt) return false;
    return start < Date.parse(entry.endedAt) && end > Date.parse(entry.startedAt);
  });
}

export function projectTotals(entries: TimeEntry[]): Map<string, number> {
  const values = new Map<string, number>();
  for (const entry of activeEntries(entries)) {
    if (entry.projectId)
      values.set(entry.projectId, (values.get(entry.projectId) ?? 0) + entry.durationSeconds);
  }
  return values;
}
