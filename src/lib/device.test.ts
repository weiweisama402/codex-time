import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDesktopOnly } from './device';

describe('desktop gate', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([true, false])('returns media-query result %s', (matches) => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches }))
    );
    expect(isDesktopOnly()).toBe(matches);
  });
});
