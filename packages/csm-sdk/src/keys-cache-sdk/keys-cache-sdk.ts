import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { Logger } from '../common/decorators/index';
import { DepositDataKey } from '../common/types';
import {
  normalizeTrimHex,
  toHexString,
} from '../common/utils/is-hexadecimal-string';
import { TransactionCallback, TransactionCallbackStage } from '../tx-sdk/types';
import {
  cleanExpiredKeys,
  isKeyExpired,
  loadKeysRecord,
  saveToLocalStorage,
} from './storage';
import { KeyCacheStatus, KeysRecord } from './types';

export type { KeyCacheEntry } from './types';
export { KeyCacheStatus } from './types';

const safe = <T>(operation: () => T, fallback: T): T => {
  try {
    return operation();
  } catch (error) {
    console.error('[keys cache] error:', error);
    return fallback;
  }
};

export class KeysCacheSDK extends CsmSDKModule {
  private get storageKey() {
    return `lido-keys-cache-${this.core.chainId}`;
  }

  private getKeys(): KeysRecord {
    return loadKeysRecord(this.storageKey);
  }

  private setKeys(keys: KeysRecord): void {
    saveToLocalStorage(this.storageKey, keys);
  }

  /**
   * Drop expired entries and persist the result. Single prune+write path
   * shared by all mutator methods. Returns the cleaned record.
   */
  private pruneAndPersist(stored: KeysRecord): KeysRecord {
    const cleaned = cleanExpiredKeys(stored);
    this.setKeys(cleaned);
    return cleaned;
  }

  /**
   * Confirmed entries are sticky: a confirmed entry will not be downgraded to
   * pending by a default-pending add. Pass { confirmed: true } to (re)assert.
   */
  @Logger('Cache:')
  public addPubkeys(pubkeys: Hex[], options?: { confirmed?: boolean }): void {
    if (pubkeys.length === 0) return;
    safe(() => {
      const ts = Date.now();
      const asConfirmed = options?.confirmed ?? false;
      const stored = this.getKeys();
      for (const pubkey of pubkeys) {
        const key = normalizeTrimHex(pubkey);
        const confirmed = asConfirmed || (stored[key]?.confirmed ?? false);
        stored[key] = { ts, confirmed };
      }
      this.pruneAndPersist(stored);
    }, undefined);
  }

  /**
   * Default removes pending entries only — confirmed entries are preserved so
   * a post-confirmation rollback can't undo on-chain state. Pass
   * { confirmed: true } to remove confirmed entries as well.
   */
  @Logger('Cache:')
  public removePubkeys(
    pubkeys: Hex[],
    options?: { confirmed?: boolean },
  ): void {
    if (pubkeys.length === 0) return;
    safe(() => {
      const includeConfirmed = options?.confirmed === true;
      const stored = this.getKeys();
      for (const pubkey of pubkeys) {
        const key = normalizeTrimHex(pubkey);
        const entry = stored[key];
        if (!entry) continue;
        if (!includeConfirmed && entry.confirmed) continue;
        delete stored[key];
      }
      this.pruneAndPersist(stored);
    }, undefined);
  }

  @Logger('Cache:')
  public clearAllKeys(): void {
    safe(() => this.setKeys({}), undefined);
  }

  @Logger('Cache:')
  public getCachedKeys(): Array<{ pubkey: Hex; confirmed: boolean }> {
    return safe(() => {
      const stored = this.getKeys();
      const cleaned = cleanExpiredKeys(stored);
      // Persist only when pruning actually removed something — a read should
      // not pay a JSON.stringify + localStorage.setItem on every call.
      if (Object.keys(cleaned).length !== Object.keys(stored).length) {
        this.setKeys(cleaned);
      }
      return Object.entries(cleaned).map(([pubkey, entry]) => ({
        pubkey: toHexString(pubkey),
        confirmed: entry.confirmed,
      }));
    }, []);
  }

  /**
   * Lookup the cache state for a pubkey. Returns `null` if the entry is
   * missing or expired. Distinguishes confirmed (on-chain observed) from
   * pending (submitted but not yet observed) so callers can apply finer-
   * grained validation — e.g. permitting re-upload of pending entries
   * after an interrupted tx.
   */
  @Logger('Cache:')
  public getCacheStatus(pubkey: Hex): KeyCacheStatus | null {
    return safe(() => {
      const entry = this.getKeys()[normalizeTrimHex(pubkey)];
      if (!entry || isKeyExpired(entry)) return null;
      return entry.confirmed
        ? KeyCacheStatus.CONFIRMED
        : KeyCacheStatus.PENDING;
    }, null);
  }

  /**
   * Downgrades existing entries to pending, bypassing the sticky-confirmed
   * guard in addPubkeys. Preserves the original ts so a remove cycle does not
   * extend TTL — without this, add→remove would reset the 2-week clock and
   * make active-operator caches effectively un-expirable.
   * Never creates new entries.
   *
   * @internal
   */
  @Logger('Cache:')
  private markPubkeysPending(pubkeys: Hex[]): void {
    safe(() => {
      if (pubkeys.length === 0) return;
      const stored = this.getKeys();
      for (const pubkey of pubkeys) {
        const key = normalizeTrimHex(pubkey);
        if (!stored[key]) continue;
        stored[key] = { ts: stored[key].ts, confirmed: false };
      }
      this.pruneAndPersist(stored);
    }, undefined);
  }

  /**
   * Add-flow lifecycle, forwards every stage to the user callback unchanged:
   * - SIGN                 -> add as pending
   * - CONFIRMATION / DONE  -> mark confirmed (dual-fire: earliest on-chain
   *                           signal wins on EOA; DONE is the primary AA signal)
   * - ERROR                -> rollback pending; sticky-confirmed protects mined txs
   * - MULTISIG_DONE        -> stays pending (no on-chain proof yet)
   *
   * Cache mutations run before the user callback and use safe() — they can't
   * throw or be skipped by user logic. User return value forwarded so
   * SIGN-stage gas overrides keep working.
   */
  public makeCallback<TDecodedResult = undefined>(
    depositData: readonly DepositDataKey[],
    user?: TransactionCallback<TDecodedResult>,
  ): TransactionCallback<TDecodedResult> {
    const pubkeys = depositData.map((d) => d.pubkey);
    return async (props) => {
      switch (props.stage) {
        case TransactionCallbackStage.SIGN:
          this.addPubkeys(pubkeys);
          break;
        case TransactionCallbackStage.CONFIRMATION:
        case TransactionCallbackStage.DONE:
          this.addPubkeys(pubkeys, { confirmed: true });
          break;
        case TransactionCallbackStage.ERROR:
          this.removePubkeys(pubkeys);
          break;
      }
      return user?.(props);
    };
  }

  /**
   * Remove-flow lifecycle. CONFIRMATION / DONE / MULTISIG_DONE all downgrade
   * confirmed → pending — uniform across wallet types so the cache treats
   * "removal attempted" as one state. Pending still blocks duplicates and
   * lets the existing TTL settle the entry naturally.
   *
   * SIGN/ERROR are no-op: nothing is pre-mutated, so there is nothing to
   * roll back on tx failure.
   */
  public makeRemovalCallback<TDecodedResult = undefined>(
    pubkeys: Hex[],
    user?: TransactionCallback<TDecodedResult>,
  ): TransactionCallback<TDecodedResult> {
    return async (props) => {
      switch (props.stage) {
        case TransactionCallbackStage.CONFIRMATION:
        case TransactionCallbackStage.DONE:
        case TransactionCallbackStage.MULTISIG_DONE:
          this.markPubkeysPending(pubkeys);
          break;
      }
      return user?.(props);
    };
  }
}
