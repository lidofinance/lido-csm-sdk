import { z } from 'zod';
import { KEY_TTL_DURATION } from './constants';
import { KeyCacheEntry, KeysRecord } from './types';

const entrySchema = z.union([
  z.object({ ts: z.number(), confirmed: z.boolean() }),
  // Legacy v1: bare timestamp → normalize to pending (we have no proof it
  // ever made it on-chain, so treat it as the safer "duplicate but rollback-able"
  // state).
  z.number().transform((ts): KeyCacheEntry => ({ ts, confirmed: false })),
]);

const hasLocalStorage = (): boolean => {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
};

export const saveToLocalStorage = (key: string, value: unknown): void => {
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('[keys cache localStorage] save error:', error);
  }
};

/**
 * Load and normalize the keys record from localStorage in one shot.
 * Returns {} for missing keys, corrupt JSON, non-object payloads, or
 * SSR environments. Malformed entries are dropped individually; legacy
 * `number` entries (v1 shape) are lifted into `{ ts, confirmed: false }`.
 */
export const loadKeysRecord = (key: string): KeysRecord => {
  if (!hasLocalStorage()) return {};
  let raw: unknown;
  try {
    const item = localStorage.getItem(key);
    if (item === null) return {};
    raw = JSON.parse(item);
  } catch (error) {
    console.error('[keys cache localStorage] load error:', error);
    return {};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: KeysRecord = {};
  for (const [pubkey, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    const parsed = entrySchema.safeParse(value);
    if (parsed.success) result[pubkey] = parsed.data;
  }
  return result;
};

export const isKeyExpired = (entry: KeyCacheEntry): boolean => {
  return Date.now() - entry.ts >= KEY_TTL_DURATION;
};

export const cleanExpiredKeys = (keys: KeysRecord): KeysRecord => {
  const result: KeysRecord = {};
  for (const [pubkey, entry] of Object.entries(keys)) {
    if (!isKeyExpired(entry)) {
      result[pubkey] = entry;
    }
  }
  return result;
};
