import { describe, expect, it } from 'vitest';
import { activeEntries, dailySeries, entriesInRange, totals } from './stats';
import { makeEntry } from '../test/factories';

describe('statistics', () => {
  const entries = [
    makeEntry({ id: crypto.randomUUID(), categoryKey: 'main', durationSeconds: 3600 }),
    makeEntry({ id: crypto.randomUUID(), categoryKey: 'extra', durationSeconds: 1800 }),
    makeEntry({ id: crypto.randomUUID(), categoryKey: 'fun', durationSeconds: 900 }),
    makeEntry({
      id: crypto.randomUUID(),
      dateKey: '2026-08-13',
      categoryKey: 'leisure',
      durationSeconds: 600
    }),
    makeEntry({
      id: crypto.randomUUID(),
      title: '已删除',
      deletedAt: '2026-08-14T09:00:00.000Z',
      durationSeconds: 9999
    })
  ];

  it('aggregates total, effective time and four categories', () => {
    const result = totals(entries);
    expect(result.total).toBe(6900);
    expect(result.effective).toBe(5400);
    expect(result.effectiveRate).toBe(78);
    expect(result.byCategory.leisure).toBe(600);
    expect(totals([]).effectiveRate).toBe(0);
  });

  it('filters soft-deleted records and date ranges', () => {
    expect(activeEntries(entries)).toHaveLength(4);
    expect(entriesInRange(entries, '2026-08-14', '2026-08-14')).toHaveLength(3);
    const series = dailySeries(entries, '2026-08-13', '2026-08-14');
    expect(series.map((item) => item.total)).toEqual([600, 6300]);
  });
});
