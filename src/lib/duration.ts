import type { ActiveTimer } from '../types';

export function activeTimerSeconds(timer: ActiveTimer | null, now = Date.now()): number {
  if (!timer) return 0;
  const running =
    timer.status === 'running' && timer.runningSince
      ? Math.max(0, Math.floor((now - Date.parse(timer.runningSince)) / 1000))
      : 0;
  return timer.accumulatedSeconds + running;
}

export function formatDuration(seconds: number, compact = false): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (compact) {
    if (hours) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
    return minutes ? `${minutes}m` : `${secs}s`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function minutesToSeconds(minutes: number): number {
  return Math.max(0, Math.round(minutes * 60));
}
