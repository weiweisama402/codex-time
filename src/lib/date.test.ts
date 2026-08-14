import { describe, expect, it } from 'vitest';
import {
  dateKey,
  daysSince,
  enumerateDates,
  formatDateLabel,
  monthBounds,
  shiftDateKey,
  shiftMonthKey,
  splitTimerByDate,
  todayKey,
  weekBounds
} from './date';
import { makeTimer } from '../test/factories';

describe('date and timezone rules', () => {
  it('uses the selected timezone around midnight and DST', () => {
    expect(dateKey('2026-08-13T16:00:00.000Z', 'Asia/Shanghai')).toBe('2026-08-14');
    expect(dateKey('2026-03-08T06:59:00.000Z', 'America/New_York')).toBe('2026-03-08');
    expect(todayKey('UTC', Date.parse('2024-02-29T23:59:00Z'))).toBe('2024-02-29');
  });

  it('handles leap years, Monday weeks, month ends and date enumeration', () => {
    expect(shiftDateKey('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftDateKey('bad', 1)).toBe('bad');
    expect(shiftMonthKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftMonthKey('bad', 1)).toBe('bad');
    expect(weekBounds('2026-08-14')).toEqual(['2026-08-10', '2026-08-16']);
    expect(monthBounds('2024-02-10')).toEqual(['2024-02-01', '2024-02-29']);
    expect(enumerateDates('2026-08-13', '2026-08-15')).toEqual(['2026-08-13', '2026-08-14', '2026-08-15']);
  });

  it('splits a timer at local midnight without losing seconds', () => {
    const timer = makeTimer({
      startedAt: '2026-02-28T15:59:30.000Z',
      runningSince: '2026-02-28T15:59:30.000Z'
    });
    const result = splitTimerByDate(timer, '2026-02-28T16:00:30.000Z', 'Asia/Shanghai');
    expect(result.map(({ dateKey: key, durationSeconds }) => [key, durationSeconds])).toEqual([
      ['2026-02-28', 30],
      ['2026-03-01', 30]
    ]);
    expect(result.reduce((sum, item) => sum + item.durationSeconds, 0)).toBe(60);
  });

  it('supports paused timers and invalid intervals', () => {
    const paused = makeTimer({
      startedAt: '2026-08-14T07:00:00.000Z',
      runningSince: null,
      status: 'paused',
      accumulatedSeconds: 90
    });
    expect(splitTimerByDate(paused, '2026-08-14T08:00:00.000Z', 'UTC')[0]?.durationSeconds).toBe(90);
    expect(splitTimerByDate(makeTimer(), '2026-08-14T07:00:00.000Z', 'Asia/Shanghai')).toEqual([]);
    expect(daysSince('2026-08-12T00:00:00.000Z', Date.parse('2026-08-14T12:00:00.000Z'))).toBe(2);
    expect(formatDateLabel('2026-08-14')).toContain('8月');
  });
});
