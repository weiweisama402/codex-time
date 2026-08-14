import { describe, expect, it } from 'vitest';
import { activeEntries, dailySeries, entriesInRange, hasOverlap, projectTotals, totals } from './stats';
import type { TimeEntry } from '../types';

const makeEntry = (
  id: string,
  categoryKey: TimeEntry['categoryKey'],
  durationSeconds: number,
  start?: string,
  end?: string
): TimeEntry => ({
  id,
  userId: '00000000-0000-4000-8000-000000000001',
  version: 0,
  createdAt: '2026-08-14T00:00:00Z',
  updatedAt: '2026-08-14T00:00:00Z',
  deletedAt: null,
  dateKey: '2026-08-14',
  startedAt: start ?? null,
  endedAt: end ?? null,
  durationSeconds,
  categoryKey,
  projectId: null,
  taskId: null,
  tagIds: [],
  title: id,
  note: '',
  source: 'manual'
});

describe('statistics', () => {
  const entries = [
    makeEntry('00000000-0000-4000-8000-000000000011', 'main', 3600),
    makeEntry('00000000-0000-4000-8000-000000000012', 'extra', 1800),
    makeEntry('00000000-0000-4000-8000-000000000013', 'fun', 900)
  ];
  it('calculates effective time independently from total', () => {
    const result = totals(entries);
    expect(result.total).toBe(6300);
    expect(result.effective).toBe(5400);
    expect(result.activeDays).toBe(1);
  });
  it('excludes soft-deleted records and filters inclusive ranges', () => {
    const deleted = {
      ...entries[0]!,
      id: '00000000-0000-4000-8000-000000000099',
      deletedAt: '2026-08-15T00:00:00Z'
    };
    expect(activeEntries([...entries, deleted])).toHaveLength(3);
    expect(entriesInRange(entries, '2026-08-14', '2026-08-14')).toHaveLength(3);
    expect(entriesInRange(entries, '2026-08-15', '2026-08-16')).toEqual([]);
    expect(totals([])).toMatchObject({ total: 0, effective: 0, activeDays: 0 });
  });
  it('fills missing days in daily series', () => {
    const series = dailySeries(entries, '2026-08-13', '2026-08-15');
    expect(series).toHaveLength(3);
    expect(series[0]?.total).toBe(0);
    expect(series[1]?.main).toBe(3600);
  });
  it('detects overlapping scheduled entries', () => {
    const a = makeEntry(
      '00000000-0000-4000-8000-000000000021',
      'main',
      3600,
      '2026-08-14T01:00:00Z',
      '2026-08-14T02:00:00Z'
    );
    const b = makeEntry(
      '00000000-0000-4000-8000-000000000022',
      'extra',
      3600,
      '2026-08-14T01:30:00Z',
      '2026-08-14T02:30:00Z'
    );
    expect(hasOverlap(a, [a, b])).toBe(true);
    expect(hasOverlap({ ...a, startedAt: null }, [a, b])).toBe(false);
    expect(hasOverlap(a, [a, { ...b, startedAt: null }])).toBe(false);
  });
  it('aggregates project durations and skips unassigned entries', () => {
    const projectId = '00000000-0000-4000-8000-000000000031';
    const assigned = { ...entries[0]!, projectId };
    const values = projectTotals([assigned, entries[1]!]);
    expect(values.get(projectId)).toBe(3600);
    expect(values.size).toBe(1);
  });
});
