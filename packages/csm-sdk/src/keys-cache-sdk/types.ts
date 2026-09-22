import type { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';

export type KeysCacheSDKProps = { core: LidoSDKCore };

export type KeyCacheEntry = {
  ts: number;
  confirmed: boolean;
};

export type KeysRecord = Record<string, KeyCacheEntry>;

export enum KeyCacheStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
}
