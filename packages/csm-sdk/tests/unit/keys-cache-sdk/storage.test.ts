import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveToLocalStorage,
  getFromLocalStorage,
  isKeyExpired,
  cleanExpiredKeys,
} from '../../../src/keys-cache-sdk/storage.js';

// Mock localStorage in node environment
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

describe('saveToLocalStorage / getFromLocalStorage', () => {
  it('round-trips an object', () => {
    saveToLocalStorage('test-key', { a: 1, b: 'hello' });
    const result = getFromLocalStorage<{ a: number; b: string }>('test-key');
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('returns null for missing key', () => {
    expect(getFromLocalStorage('nonexistent')).toBeNull();
  });

  it('returns null and logs error for corrupt data', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store['corrupt'] = '{invalid json';
    const result = getFromLocalStorage('corrupt');
    expect(result).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

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
});

describe('isKeyExpired', () => {
  it('returns false for fresh timestamp', () => {
    expect(isKeyExpired(Date.now())).toBe(false);
  });

  it('returns true for old timestamp', () => {
    const twoWeeksAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
    expect(isKeyExpired(twoWeeksAgo)).toBe(true);
  });

  it('returns true at exactly 2-week boundary', () => {
    const exactBoundary = Date.now() - 14 * 24 * 60 * 60 * 1000;
    expect(isKeyExpired(exactBoundary)).toBe(true);
  });

  it('returns false just before 2-week boundary', () => {
    const justBefore = Date.now() - 14 * 24 * 60 * 60 * 1000 + 1;
    expect(isKeyExpired(justBefore)).toBe(false);
  });
});

describe('cleanExpiredKeys', () => {
  it('removes expired keys', () => {
    const now = Date.now();
    const keys = {
      '0xfresh': now,
      '0xexpired': now - 15 * 24 * 60 * 60 * 1000,
    };
    const result = cleanExpiredKeys(keys);
    expect(result).toEqual({ '0xfresh': now });
  });

  it('returns empty for all expired', () => {
    const old = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const result = cleanExpiredKeys({ '0xa': old, '0xb': old });
    expect(result).toEqual({});
  });

  it('keeps all fresh keys', () => {
    const now = Date.now();
    const keys = { '0xa': now, '0xb': now - 1000 };
    const result = cleanExpiredKeys(keys);
    expect(result).toEqual(keys);
  });

  it('handles empty input', () => {
    expect(cleanExpiredKeys({})).toEqual({});
  });
});
