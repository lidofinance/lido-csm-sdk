import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KeyCacheStatus,
  KeysCacheSDK,
} from '../../../src/keys-cache-sdk/keys-cache-sdk';
import { KEY_TTL_DURATION } from '../../../src/keys-cache-sdk/constants';
import { withKeysCacheCallback } from '../../../src/keys-cache-sdk/with-keys-cache-callback';
import { TransactionCallbackStage } from '../../../src/tx-sdk/types';
import { SDKError } from '../../../src/common/utils/sdk-error';

const CHAIN_ID = 1;
const STORAGE_KEY = `lido-keys-cache-${CHAIN_ID}`;
const PK_A =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const PK_B =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const PK_C =
  '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as const;
// Storage keys are normalized: 0x trimmed + lowercased.
const KEY_A = PK_A.slice(2);
const KEY_B = PK_B.slice(2);
const KEY_C = PK_C.slice(2);

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

const makeSdk = () => new KeysCacheSDK({ core: { chainId: CHAIN_ID } as any });

const readStore = () => JSON.parse(store[STORAGE_KEY] ?? '{}');

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
  vi.useRealTimers();
});

describe('KeysCacheSDK.addPubkeys', () => {
  it('adds new entries as pending by default', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A, PK_B]);
    const stored = readStore();
    expect(stored[KEY_A].confirmed).toBe(false);
    expect(stored[KEY_B].confirmed).toBe(false);
    expect(typeof stored[KEY_A].ts).toBe('number');
  });

  it('adds new entries as confirmed when { confirmed: true }', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    expect(readStore()[KEY_A].confirmed).toBe(true);
  });

  it('normalizes pubkeys to lowercase + trims 0x', () => {
    const sdk = makeSdk();
    const mixed = ('0x' + 'AaAa'.repeat(24)) as `0x${string}`;
    sdk.addPubkeys([mixed]);
    const keys = Object.keys(readStore());
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBe('aaaa'.repeat(24));
    expect(keys[0]).not.toContain('0x');
  });

  it('is a no-op for empty array (does not write)', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([]);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('sticky-confirmed: default add does not downgrade an existing confirmed entry', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    sdk.addPubkeys([PK_A]);
    expect(readStore()[KEY_A].confirmed).toBe(true);
  });

  it('explicit { confirmed: true } upgrades an existing pending entry', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    expect(readStore()[KEY_A].confirmed).toBe(false);
    sdk.addPubkeys([PK_A], { confirmed: true });
    expect(readStore()[KEY_A].confirmed).toBe(true);
  });

  it('refreshes ts when re-adding the same pubkey', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    const tsBefore = readStore()[KEY_A].ts;
    vi.setSystemTime(1_005_000);
    sdk.addPubkeys([PK_A]);
    expect(readStore()[KEY_A].ts).toBeGreaterThan(tsBefore);
  });

  it('drops expired entries already in storage as a side effect', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000);
    store[STORAGE_KEY] = JSON.stringify({
      [KEY_C]: { ts: 1_000_000_000 - KEY_TTL_DURATION, confirmed: true },
    });
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    const stored = readStore();
    expect(stored[KEY_C]).toBeUndefined();
    expect(stored[KEY_A]).toBeDefined();
  });
});

describe('KeysCacheSDK.removePubkeys', () => {
  it('removes pending entries by default', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A, PK_B]);
    sdk.removePubkeys([PK_A]);
    const stored = readStore();
    expect(stored[KEY_A]).toBeUndefined();
    expect(stored[KEY_B]).toBeDefined();
  });

  it('preserves confirmed entries by default (rollback safety)', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    sdk.removePubkeys([PK_A]);
    expect(readStore()[KEY_A]).toBeDefined();
    expect(readStore()[KEY_A].confirmed).toBe(true);
  });

  it('removes confirmed entries with { confirmed: true }', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    sdk.removePubkeys([PK_A], { confirmed: true });
    expect(readStore()[KEY_A]).toBeUndefined();
  });

  it('is a no-op for empty array', () => {
    const sdk = makeSdk();
    sdk.removePubkeys([]);
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('ignores pubkeys that are not in cache', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    sdk.removePubkeys([PK_B]);
    expect(readStore()[KEY_A]).toBeDefined();
  });
});

describe('KeysCacheSDK.clearAllKeys', () => {
  it('empties the record', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A, PK_B], { confirmed: true });
    sdk.clearAllKeys();
    expect(readStore()).toEqual({});
  });
});

describe('KeysCacheSDK.getCachedKeys', () => {
  it('returns { pubkey, confirmed } for every live entry', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    sdk.addPubkeys([PK_B], { confirmed: true });
    const result = sdk
      .getCachedKeys()
      .sort((a, b) => a.pubkey.localeCompare(b.pubkey));
    expect(result).toEqual([
      { pubkey: PK_A, confirmed: false },
      { pubkey: PK_B, confirmed: true },
    ]);
  });

  it('prunes expired entries and persists the pruned record', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000);
    // Seed storage directly so the expired entry is not pre-pruned by addPubkeys.
    store[STORAGE_KEY] = JSON.stringify({
      [KEY_A]: { ts: 1_000_000_000 - KEY_TTL_DURATION - 1, confirmed: false },
      [KEY_B]: { ts: 1_000_000_000, confirmed: false },
    });
    const sdk = makeSdk();
    localStorageMock.setItem.mockClear();
    const result = sdk.getCachedKeys();
    expect(result.map((e) => e.pubkey)).toEqual([PK_B]);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
  });

  it('skips the write when nothing expired (efficiency guard)', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A, PK_B]);
    localStorageMock.setItem.mockClear();
    sdk.getCachedKeys();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('returns [] when storage is empty', () => {
    expect(makeSdk().getCachedKeys()).toEqual([]);
  });
});

describe('KeysCacheSDK.getCacheStatus', () => {
  it('returns CONFIRMED for confirmed entries', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.CONFIRMED);
  });

  it('returns PENDING for pending entries', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.PENDING);
  });

  it('returns null for missing entries', () => {
    expect(makeSdk().getCacheStatus(PK_A)).toBeNull();
  });

  it('returns null for expired entries (without mutating storage)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000_000);
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    vi.setSystemTime(1_000_000_000 + KEY_TTL_DURATION + 1);
    expect(sdk.getCacheStatus(PK_A)).toBeNull();
  });

  it('matches pubkeys case-insensitively', () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A]);
    const upper = PK_A.toUpperCase().replace('0X', '0x') as `0x${string}`;
    expect(sdk.getCacheStatus(upper)).toBe(KeyCacheStatus.PENDING);
  });
});

describe('KeysCacheSDK.makeCallback', () => {
  const depositData = [{ pubkey: PK_A } as any, { pubkey: PK_B } as any];

  it('SIGN adds entries as pending', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.PENDING);
    expect(sdk.getCacheStatus(PK_B)).toBe(KeyCacheStatus.PENDING);
  });

  it('CONFIRMATION marks entries confirmed', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.CONFIRMATION,
      payload: { receipt: {} as any, hash: '0x0' as any },
    });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.CONFIRMED);
  });

  it('DONE marks entries confirmed (idempotent with CONFIRMATION)', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.CONFIRMATION,
      payload: { receipt: {} as any, hash: '0x0' as any },
    });
    await cb({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: undefined,
        confirmations: 1n,
        receipt: {} as any,
        hash: '0x0' as any,
      },
    });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.CONFIRMED);
  });

  it('ERROR rolls back pending entries', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.ERROR,
      payload: { error: SDKError.from(new Error('boom')) },
    });
    expect(sdk.getCacheStatus(PK_A)).toBeNull();
    expect(sdk.getCacheStatus(PK_B)).toBeNull();
  });

  it('ERROR does not roll back already-confirmed entries (sticky)', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: undefined,
        confirmations: 1n,
        receipt: {} as any,
        hash: '0x0' as any,
      },
    });
    await cb({
      stage: TransactionCallbackStage.ERROR,
      payload: { error: SDKError.from(new Error('late')) },
    });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.CONFIRMED);
  });

  it('MULTISIG_DONE does not change cache state', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.MULTISIG_DONE,
      payload: undefined,
    });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.PENDING);
  });

  it('forwards every stage to the user callback with the original props', async () => {
    const sdk = makeSdk();
    const user = vi.fn();
    const cb = sdk.makeCallback(depositData, user);
    const signProps = {
      stage: TransactionCallbackStage.SIGN,
      payload: { gas: 21_000n },
    } as const;
    await cb(signProps);
    expect(user).toHaveBeenCalledWith(signProps);
  });

  it('forwards the user callback return value (SIGN gas override)', async () => {
    const sdk = makeSdk();
    const user = vi.fn().mockReturnValue(50_000n);
    const cb = sdk.makeCallback(depositData, user);
    const result = await cb({
      stage: TransactionCallbackStage.SIGN,
      payload: {},
    });
    expect(result).toBe(50_000n);
  });

  it('works when no user callback is provided', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeCallback(depositData);
    await expect(
      cb({ stage: TransactionCallbackStage.SIGN, payload: {} }),
    ).resolves.toBeUndefined();
  });
});

describe('KeysCacheSDK.makeRemovalCallback', () => {
  const stages = [
    TransactionCallbackStage.CONFIRMATION,
    TransactionCallbackStage.DONE,
    TransactionCallbackStage.MULTISIG_DONE,
  ];

  const propsByStage = (stage: TransactionCallbackStage) => {
    switch (stage) {
      case TransactionCallbackStage.CONFIRMATION:
        return {
          stage,
          payload: { receipt: {} as any, hash: '0x0' as any },
        } as const;
      case TransactionCallbackStage.DONE:
        return {
          stage,
          payload: {
            result: undefined,
            confirmations: 1n,
            receipt: {} as any,
            hash: '0x0' as any,
          },
        } as const;
      default:
        return { stage, payload: undefined } as const;
    }
  };

  it.each(stages)('downgrades confirmed → pending on %s', async (stage) => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    const cb = sdk.makeRemovalCallback([PK_A]);
    await cb(propsByStage(stage) as any);
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.PENDING);
  });

  it('preserves the original ts (does not extend TTL)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    const tsBefore = readStore()[KEY_A].ts;
    vi.setSystemTime(2_000_000);
    const cb = sdk.makeRemovalCallback([PK_A]);
    await cb(propsByStage(TransactionCallbackStage.DONE) as any);
    expect(readStore()[KEY_A].ts).toBe(tsBefore);
  });

  it('does not create entries for unknown pubkeys', async () => {
    const sdk = makeSdk();
    const cb = sdk.makeRemovalCallback([PK_A]);
    await cb(propsByStage(TransactionCallbackStage.DONE) as any);
    expect(readStore()[KEY_A]).toBeUndefined();
  });

  it('SIGN and ERROR are no-ops', async () => {
    const sdk = makeSdk();
    sdk.addPubkeys([PK_A], { confirmed: true });
    const cb = sdk.makeRemovalCallback([PK_A]);
    await cb({ stage: TransactionCallbackStage.SIGN, payload: {} });
    await cb({
      stage: TransactionCallbackStage.ERROR,
      payload: { error: SDKError.from(new Error('x')) },
    });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.CONFIRMED);
  });

  it('forwards stages to the user callback', async () => {
    const sdk = makeSdk();
    const user = vi.fn();
    const cb = sdk.makeRemovalCallback([PK_A], user);
    const props = propsByStage(TransactionCallbackStage.DONE);
    await cb(props as any);
    expect(user).toHaveBeenCalledWith(props);
  });
});

describe('withKeysCacheCallback', () => {
  const depositData = [{ pubkey: PK_A } as any];

  it('returns the user callback unchanged when cache is undefined', () => {
    const user = vi.fn();
    expect(withKeysCacheCallback(undefined, depositData, user)).toBe(user);
  });

  it('returns undefined when both cache and user callback are undefined', () => {
    expect(withKeysCacheCallback(undefined, depositData)).toBeUndefined();
  });

  it('returns a wrapped callback that mutates the cache when cache is present', async () => {
    const sdk = makeSdk();
    const wrapped = withKeysCacheCallback(sdk, depositData);
    expect(wrapped).toBeDefined();
    await wrapped!({ stage: TransactionCallbackStage.SIGN, payload: {} });
    expect(sdk.getCacheStatus(PK_A)).toBe(KeyCacheStatus.PENDING);
  });

  it('forwards user callback through the wrapper', async () => {
    const sdk = makeSdk();
    const user = vi.fn();
    const wrapped = withKeysCacheCallback(sdk, depositData, user);
    const props = {
      stage: TransactionCallbackStage.SIGN,
      payload: {},
    } as const;
    await wrapped!(props);
    expect(user).toHaveBeenCalledWith(props);
  });
});
