import { Hex } from 'viem';
import { DepositDataKey } from '../common/types';
import { TransactionCallback } from '../tx-sdk/types';
import { KeysCacheSDK } from './keys-cache-sdk';

export const withKeysCacheCallback = <TDecodedResult = undefined>(
  cache: KeysCacheSDK | undefined,
  depositData: readonly DepositDataKey[],
  originCallback?: TransactionCallback<TDecodedResult>,
): TransactionCallback<TDecodedResult> | undefined =>
  cache?.makeCallback(depositData, originCallback) ?? originCallback;

export const withKeysRemovalCacheCallback = <TDecodedResult = undefined>(
  cache: KeysCacheSDK | undefined,
  pubkeys: Hex[] | undefined,
  originCallback?: TransactionCallback<TDecodedResult>,
): TransactionCallback<TDecodedResult> | undefined =>
  (pubkeys?.length
    ? cache?.makeRemovalCallback(pubkeys, originCallback)
    : undefined) ?? originCallback;
