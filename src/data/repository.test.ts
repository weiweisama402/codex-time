import { beforeEach, describe, expect, it } from 'vitest';
import { SOFT_DELETE_RETENTION_DAYS } from '../constants';
import { makeBackup, makeEntry } from '../test/factories';
import { db } from './db';
import { loadLocalSnapshot, replaceFromBackup, setEntries } from './repository';

describe('v2 IndexedDB repository', () => {
  beforeEach(async () => {
    db.close();
    await db.delete();
    await db.open();
  });

  it('uses an isolated v2 database and purges soft deletes after 30 days', async () => {
    expect(db.name).toBe('shiheng-v2');
    const now = Date.parse('2026-08-14T12:00:00.000Z');
    await setEntries([
      makeEntry({
        id: crypto.randomUUID(),
        deletedAt: new Date(now - (SOFT_DELETE_RETENTION_DAYS + 1) * 86400000).toISOString()
      }),
      makeEntry({ id: crypto.randomUUID(), title: '保留记录' })
    ]);
    const snapshot = await loadLocalSnapshot(now);
    expect(snapshot.entries.map((entry) => entry.title)).toEqual(['保留记录']);
  });

  it('replaces valid imports atomically and preserves data after invalid input', async () => {
    await setEntries([makeEntry({ title: '原始记录' })]);
    const replacement = makeBackup({ entries: [makeEntry({ title: '导入记录' })], revision: 8 });
    await replaceFromBackup(replacement);
    expect((await loadLocalSnapshot()).entries[0]?.title).toBe('导入记录');

    await expect(replaceFromBackup({ ...replacement, schemaVersion: '9.0' })).rejects.toThrow();
    expect((await loadLocalSnapshot()).entries[0]?.title).toBe('导入记录');
  });
});
