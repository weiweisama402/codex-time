import { describe, expect, it } from 'vitest';
import { parseBackup } from './validation';

describe('backup validation', () => {
  const empty = {
    schemaVersion: '1.0',
    exportedAt: '2026-08-14T00:00:00Z',
    projects: [],
    tasks: [],
    tags: [],
    entries: [],
    presets: [],
    plans: [],
    reviews: [],
    settings: null
  };
  it('accepts a v1 backup', () => expect(parseBackup(empty).schemaVersion).toBe('1.0'));
  it('rejects unknown major versions', () =>
    expect(() => parseBackup({ ...empty, schemaVersion: '2.0' })).toThrow());
  it('rejects malformed collections', () => expect(() => parseBackup({ ...empty, entries: {} })).toThrow());
});
