import type { ActiveTimerV2 } from '../types';

const DAY_MS = 86_400_000;

export function dateKey(value: Date | number | string, timezone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function todayKey(timezone: string, now = Date.now()): string {
  return dateKey(now, timezone);
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function shiftMonthKey(key: string, months: number): string {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return key;
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function weekBounds(anchor: string): [string, string] {
  const date = new Date(`${anchor}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  const start = shiftDateKey(anchor, -offset);
  return [start, shiftDateKey(start, 6)];
}

export function monthBounds(anchor: string): [string, string] {
  const [year, month] = anchor.split('-').map(Number);
  const start = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year!, month!, 0)).toISOString().slice(0, 10);
  return [start, end];
}

export function enumerateDates(start: string, end: string): string[] {
  const values: string[] = [];
  for (let cursor = start; cursor <= end; cursor = shiftDateKey(cursor, 1)) values.push(cursor);
  return values;
}

export function formatDateLabel(key: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    ...options,
    timeZone: 'UTC'
  }).format(new Date(`${key}T00:00:00Z`));
}

export function daysSince(iso: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / DAY_MS));
}

export interface TimerSegment {
  dateKey: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

function nextDateBoundary(startMs: number, endMs: number, timezone: string, key: string): number {
  let low = startMs + 1;
  let high = endMs;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (dateKey(mid, timezone) === key) low = mid + 1;
    else high = mid;
  }
  return low;
}

export function splitTimerByDate(timer: ActiveTimerV2, endedAt: string, timezone: string): TimerSegment[] {
  const endMs = Date.parse(endedAt);
  const startMs = Date.parse(timer.startedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];

  const elapsedSinceResume = timer.runningSince
    ? Math.max(0, endMs - Date.parse(timer.runningSince)) / 1000
    : 0;
  const totalSeconds = Math.max(1, Math.round(timer.accumulatedSeconds + elapsedSinceResume));
  const effectiveStartMs = endMs - totalSeconds * 1000;
  const result: TimerSegment[] = [];
  let cursor = effectiveStartMs;

  while (cursor < endMs) {
    const key = dateKey(cursor, timezone);
    const boundary =
      dateKey(endMs - 1, timezone) === key ? endMs : nextDateBoundary(cursor, endMs, timezone, key);
    result.push({
      dateKey: key,
      startedAt: new Date(cursor).toISOString(),
      endedAt: new Date(boundary).toISOString(),
      durationSeconds: Math.max(1, Math.round((boundary - cursor) / 1000))
    });
    cursor = boundary;
  }

  const delta = totalSeconds - result.reduce((sum, segment) => sum + segment.durationSeconds, 0);
  if (delta && result.length) result[result.length - 1]!.durationSeconds += delta;
  return result;
}
