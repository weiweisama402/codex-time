import { describe, expect, it } from 'vitest';
import { activeTimerSeconds, formatDuration, minutesToSeconds } from './duration';
import type { ActiveTimer } from '../types';

const timer: ActiveTimer = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: '00000000-0000-4000-8000-000000000001',
  version: 0,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  deletedAt: null,
  categoryKey: 'main',
  projectId: null,
  taskId: null,
  tagIds: [],
  title: 'test',
  note: '',
  startedAt: '2026-08-14T00:00:00Z',
  runningSince: '2026-08-14T00:01:00Z',
  accumulatedSeconds: 60,
  status: 'running'
};

describe('duration helpers', () => {
  it('combines accumulated and running seconds', () =>
    expect(activeTimerSeconds(timer, Date.parse('2026-08-14T00:03:30Z'))).toBe(210));
  it('returns zero without a timer and accumulated time while paused', () => {
    expect(activeTimerSeconds(null)).toBe(0);
    expect(activeTimerSeconds({ ...timer, status: 'paused', runningSince: null }, 0)).toBe(60);
  });
  it('formats compact and clock durations', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(3661, true)).toBe('1h 1m');
  });
  it('formats short durations and clamps negative input', () => {
    expect(formatDuration(30, true)).toBe('30s');
    expect(formatDuration(120, true)).toBe('2m');
    expect(formatDuration(3600, true)).toBe('1h');
    expect(formatDuration(-5)).toBe('00:00:00');
  });
  it('converts minutes safely', () => {
    expect(minutesToSeconds(2.5)).toBe(150);
    expect(minutesToSeconds(-1)).toBe(0);
  });
});
