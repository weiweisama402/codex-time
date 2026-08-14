import { describe, expect, it } from 'vitest';
import { activeTimerSeconds, formatClock, formatDuration } from './duration';
import { makeTimer } from '../test/factories';

describe('duration', () => {
  it('restores a running timer from persisted timestamps', () => {
    const timer = makeTimer({ accumulatedSeconds: 90 });
    expect(activeTimerSeconds(timer, Date.parse('2026-08-14T08:01:15.900Z'))).toBe(165);
  });

  it('keeps paused accumulation stable and clamps invalid values', () => {
    const paused = makeTimer({ runningSince: null, status: 'paused', accumulatedSeconds: 125 });
    expect(activeTimerSeconds(paused, 0)).toBe(125);
    expect(activeTimerSeconds(null)).toBe(0);
    expect(formatClock(-4)).toBe('00:00:00');
  });

  it('formats precise clocks and compact reports', () => {
    expect(formatClock(3661.9)).toBe('01:01:01');
    expect(formatDuration(20)).toBe('20s');
    expect(formatDuration(3599)).toBe('60m');
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(7260)).toBe('2h 1m');
  });
});
