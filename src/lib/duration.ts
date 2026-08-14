import type { ActiveTimerV2 } from '../types';

export function activeTimerSeconds(timer: ActiveTimerV2 | null, now = Date.now()): number {
  if (!timer) return 0;
  const running = timer.runningSince
    ? Math.max(0, Math.floor((now - Date.parse(timer.runningSince)) / 1000))
    : 0;
  return Math.max(0, timer.accumulatedSeconds + running);
}

export function formatClock(totalSeconds: number): string {
  const value = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export function formatDuration(totalSeconds: number): string {
  const value = Math.max(0, Math.round(totalSeconds));
  if (value < 60) return `${value}s`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
