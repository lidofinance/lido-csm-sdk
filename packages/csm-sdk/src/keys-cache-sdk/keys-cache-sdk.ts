import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Logger } from '../common/decorators/index.js';
import {
  normalizeTrimHex,
  toHexString,
} from '../common/utils/is-hexadecimal-string.js';
import {
  cleanExpiredKeys,
  getFromLocalStorage,
  isKeyExpired,
  saveToLocalStorage,
} from './storage.js';
import { KeysRecord } from './types.js';

export class KeysCacheSDK extends CsmSDKModule {
  private get storageKey() {
    // FIXME: other value for CM? may be use module id?
    return `lido-csm-keys-cache-${this.core.chainId}`;
  }

  /**
   * Get all keys from storage for current chain
   */
  private getKeys(): KeysRecord {
    return getFromLocalStorage<KeysRecord>(this.storageKey) || {};
  }

  /**
   * Save keys to storage for current chain
   */
  private setKeys(keys: KeysRecord): void {
    saveToLocalStorage(this.storageKey, keys);
  }

  /**
   * Add pubkeys to cache with current timestamp
   * Automatically cleans expired keys
   */
  @Logger('Cache:')
  public addPubkeys(pubkeys: Hex[]): void {
    if (pubkeys.length === 0) return;

    const timestamp = Date.now();
    const storedKeys = this.getKeys();

    // Add new keys (normalized to lowercase for case-insensitive matching)
    const updatedKeys = pubkeys.reduce(
      (keys, pubkey) => {
        const key = normalizeTrimHex(pubkey);
        keys[key] = timestamp;
        return keys;
      },
      { ...storedKeys },
    );

    // Clean expired keys and save
    const cleanedKeys = cleanExpiredKeys(updatedKeys);
    this.setKeys(cleanedKeys);
  }

  /**
   * Remove specific pubkeys from cache
   * Automatically cleans expired keys
   */
  @Logger('Cache:')
  public removePubkeys(pubkeys: Hex[]): void {
    if (pubkeys.length === 0) return;

    const storedKeys = this.getKeys();

    // Remove specified keys (normalized for case-insensitive matching)
    const updatedKeys = { ...storedKeys };
    pubkeys.forEach((pubkey) => {
      const key = normalizeTrimHex(pubkey);
      delete updatedKeys[key];
    });

    // Clean expired keys and save
    const cleanedKeys = cleanExpiredKeys(updatedKeys);
    this.setKeys(cleanedKeys);
  }

  /**
   * Clear all cached keys for current chain
   */
  @Logger('Cache:')
  public clearAllKeys(): void {
    this.setKeys({});
  }

  /**
   * Check if a specific pubkey exists in cache and is not expired
   */
  @Logger('Cache:')
  public hasCachedKey(pubkey: Hex): boolean {
    const key = normalizeTrimHex(pubkey);
    const storedKeys = this.getKeys();
    const timestamp = storedKeys[key];

    if (!timestamp) return false;

    return !isKeyExpired(timestamp);
  }

  /**
   * Get all valid (non-expired) cached keys
   * Automatically cleans expired keys during retrieval
   */
  @Logger('Cache:')
  public getCachedKeys(): Hex[] {
    const storedKeys = this.getKeys();
    const cleanedKeys = cleanExpiredKeys(storedKeys);

    // Update storage to remove expired keys
    this.setKeys(cleanedKeys);

    return Object.keys(cleanedKeys).map(toHexString);
  }

  /**
   * Check if pubkey would be a duplicate (already exists in cache)
   */
  @Logger('Cache:')
  public isDuplicate(pubkey: Hex): boolean {
    return this.hasCachedKey(pubkey);
  }
}
