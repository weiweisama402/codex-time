import { describe, expect, it } from 'vitest';
import { decideRemoteMerge } from './syncPolicy';

describe('sync merge policy', () => {
  it('applies a newer remote entity without local edits', () =>
    expect(decideRemoteMerge(3, 2, null)).toBe('apply'));
  it('ignores an old remote echo', () => expect(decideRemoteMerge(2, 2, null)).toBe('ignore'));
  it('raises a conflict when remote changed after local base', () =>
    expect(decideRemoteMerge(4, 3, 3)).toBe('conflict'));
  it('ignores remote data already represented by pending base', () =>
    expect(decideRemoteMerge(3, 3, 3)).toBe('ignore'));
});
