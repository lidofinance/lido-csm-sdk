import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanExpiredKeys,
  isKeyExpired,
  loadKeysRecord,
  saveToLocalStorage,
} from '../../../src/keys-cache-sdk/storage';

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const key of Object.keys(store)) delete store[key];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('saveToLocalStorage', () => {
  it('handles save error gracefully', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceeded');
    });
    saveToLocalStorage('key', 'value');
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('save error'),
      expect.any(Error),
    );
  });

  it('is a no-op when localStorage is undefined', () => {
    // @ts-expect-error -- intentionally remove for SSR-like state
    delete globalThis.localStorage;
    expect(() => saveToLocalStorage('any', 1)).not.toThrow();
  });
});

describe('isKeyExpired', () => {
  it('returns false for fresh entry', () => {
    expect(isKeyExpired({ ts: Date.now(), confirmed: false })).toBe(false);
  });

  it('returns true for old entry', () => {
    const twoWeeksAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    expect(isKeyExpired({ ts: twoWeeksAgo, confirmed: true })).toBe(true);
  });

  it('returns true at exactly 2-week boundary', () => {
    const exactBoundary = Date.now() - 14 * 24 * 60 * 60 * 1000;
    expect(isKeyExpired({ ts: exactBoundary, confirmed: false })).toBe(true);
  });

  it('returns false just before 2-week boundary', () => {
    const justBefore = Date.now() - 14 * 24 * 60 * 60 * 1000 + 1;
    expect(isKeyExpired({ ts: justBefore, confirmed: true })).toBe(false);
  });
});

describe('cleanExpiredKeys', () => {
  it('removes expired keys regardless of confirmation', () => {
    const now = Date.now();
    const old = now - 15 * 24 * 60 * 60 * 1000;
    const keys = {
      '0xfresh-pending': { ts: now, confirmed: false },
      '0xfresh-confirmed': { ts: now, confirmed: true },
      '0xexpired-pending': { ts: old, confirmed: false },
      '0xexpired-confirmed': { ts: old, confirmed: true },
    };
    const result = cleanExpiredKeys(keys);
    expect(result).toEqual({
      '0xfresh-pending': { ts: now, confirmed: false },
      '0xfresh-confirmed': { ts: now, confirmed: true },
    });
  });

  it('returns empty for all expired', () => {
    const old = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const result = cleanExpiredKeys({
      '0xa': { ts: old, confirmed: false },
      '0xb': { ts: old, confirmed: true },
    });
    expect(result).toEqual({});
  });

  it('keeps all fresh keys', () => {
    const now = Date.now();
    const keys = {
      '0xa': { ts: now, confirmed: false },
      '0xb': { ts: now - 1000, confirmed: true },
    };
    const result = cleanExpiredKeys(keys);
    expect(result).toEqual(keys);
  });

  it('handles empty input', () => {
    expect(cleanExpiredKeys({})).toEqual({});
  });
});

describe('loadKeysRecord', () => {
  const KEY = 'lido-keys-cache-1';

  it('returns empty for missing key', () => {
    expect(loadKeysRecord('nonexistent')).toEqual({});
  });

  it('returns empty and logs error for corrupt JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store[KEY] = '{invalid json';
    expect(loadKeysRecord(KEY)).toEqual({});
    expect(spy).toHaveBeenCalled();
  });

  it('returns empty for non-object payloads', () => {
    for (const raw of [42, 'string', true, null]) {
      saveToLocalStorage(KEY, raw);
      expect(loadKeysRecord(KEY)).toEqual({});
    }
  });

  it('returns empty when localStorage is undefined', () => {
    // @ts-expect-error -- intentionally remove for SSR-like state
    delete globalThis.localStorage;
    expect(loadKeysRecord(KEY)).toEqual({});
  });

  it('parses new-shape entries as-is', () => {
    const ts = Date.now();
    saveToLocalStorage(KEY, {
      '0xa': { ts, confirmed: false },
      '0xb': { ts, confirmed: true },
    });
    expect(loadKeysRecord(KEY)).toEqual({
      '0xa': { ts, confirmed: false },
      '0xb': { ts, confirmed: true },
    });
  });

  it('normalizes legacy (bare timestamp) entries to pending', () => {
    const ts = Date.now();
    saveToLocalStorage(KEY, { '0xa': ts, '0xb': ts - 1000 });
    expect(loadKeysRecord(KEY)).toEqual({
      '0xa': { ts, confirmed: false },
      '0xb': { ts: ts - 1000, confirmed: false },
    });
  });

  it('handles mixed legacy + new entries in the same record', () => {
    const ts = Date.now();
    saveToLocalStorage(KEY, {
      '0xlegacy': ts,
      '0xpending': { ts, confirmed: false },
      '0xconfirmed': { ts, confirmed: true },
    });
    expect(loadKeysRecord(KEY)).toEqual({
      '0xlegacy': { ts, confirmed: false },
      '0xpending': { ts, confirmed: false },
      '0xconfirmed': { ts, confirmed: true },
    });
  });

  it('drops malformed entries but keeps valid siblings', () => {
    const ts = Date.now();
    saveToLocalStorage(KEY, {
      '0xgood': { ts, confirmed: true },
      '0xlegacy': ts,
      '0xbad-shape': { ts, confirmed: 'yes' },
      '0xbad-string': 'not-a-number',
      '0xbad-null': null,
      '0xbad-missing-confirmed': { ts },
    });
    expect(loadKeysRecord(KEY)).toEqual({
      '0xgood': { ts, confirmed: true },
      '0xlegacy': { ts, confirmed: false },
    });
  });

  it('round-trips through storage and migrates legacy on next write', () => {
    const tsA = 1_700_000_000_000;
    const tsB = 1_700_000_001_000;
    // Simulate a v1 record persisted by older SDK
    saveToLocalStorage(KEY, { '0xa': tsA, '0xb': tsB });
    const loaded = loadKeysRecord(KEY);
    expect(loaded).toEqual({
      '0xa': { ts: tsA, confirmed: false },
      '0xb': { ts: tsB, confirmed: false },
    });
    // Writing back persists in the new shape — next read sees it directly
    saveToLocalStorage(KEY, loaded);
    expect(loadKeysRecord(KEY)).toEqual(loaded);
  });
});
