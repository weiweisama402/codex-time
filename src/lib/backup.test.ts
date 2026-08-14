import { describe, expect, it } from 'vitest';
import { decideCloudAction, parseBackup } from './backup';
import { makeBackup } from '../test/factories';

describe('backup validation and conflict policy', () => {
  it('accepts a complete v2 backup', () => {
    const value = makeBackup({ revision: 4 });
    expect(parseBackup(value).revision).toBe(4);
  });

  it('rejects unknown major versions and malformed values', () => {
    expect(() => parseBackup({ schemaVersion: '3.0' })).toThrow('不支持的备份主版本');
    expect(() =>
      parseBackup({ ...makeBackup(), settings: { ...makeBackup().settings, timezone: 'Mars/Base' } })
    ).toThrow('备份文件格式不正确');
    expect(() => parseBackup({ schemaVersion: '2.0' })).toThrow('备份文件格式不正确');
  });

  it('never silently overwrites a diverged revision', () => {
    expect(decideCloudAction(2, 2, false)).toBe('idle');
    expect(decideCloudAction(2, 2, true)).toBe('upload');
    expect(decideCloudAction(2, 3, false)).toBe('restore');
    expect(decideCloudAction(2, 3, true)).toBe('conflict');
    expect(decideCloudAction(3, 2, false)).toBe('conflict');
  });
});
