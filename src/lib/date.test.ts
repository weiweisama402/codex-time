import { describe, expect, it } from 'vitest';
import {
  combineLocalDateTime,
  dateKey,
  enumerateDates,
  formatDateLabel,
  periodBounds,
  periodStart,
  shiftDateKey,
  toLocalTimeInput,
  todayKey
} from './date';

describe('date rules', () => {
  it('creates a date key in the selected timezone', () => {
    const instant = new Date('2026-08-14T16:30:00.000Z');
    expect(dateKey(instant, 'Asia/Shanghai')).toBe('2026-08-15');
    expect(dateKey(instant, 'UTC')).toBe('2026-08-14');
  });

  it('handles leap years and Monday week boundaries', () => {
    expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(periodBounds('week', '2026-08-14')).toEqual(['2026-08-10', '2026-08-16']);
    expect(periodBounds('day', '2026-08-14')).toEqual(['2026-08-14', '2026-08-14']);
    expect(periodBounds('month', '2028-02-14')).toEqual(['2028-02-01', '2028-02-29']);
    expect(periodBounds('year', '2028-02-14')).toEqual(['2028-01-01', '2028-12-31']);
    expect(periodStart('month', '2026-08-14')).toBe('2026-08-01');
  });

  it('enumerates inclusive date ranges', () => {
    expect(enumerateDates('2026-12-30', '2027-01-02')).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02'
    ]);
    expect(enumerateDates('2027-01-02', '2027-01-01')).toEqual([]);
  });

  it('formats labels and local time inputs', () => {
    expect(formatDateLabel('2026-08-14', { year: 'numeric' })).toContain('2026');
    expect(toLocalTimeInput(null)).toBe('');
    expect(toLocalTimeInput('2026-08-14T01:05:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
    expect(combineLocalDateTime('2026-08-14', '')).toBeNull();
    expect(combineLocalDateTime('invalid', '10:00')).toBeNull();
    expect(combineLocalDateTime('2026-08-14', '10:00')).toMatch(/^2026-08-14T/);
    expect(todayKey('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
