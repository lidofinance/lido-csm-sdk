export type KeyCacheEntry = {
  ts: number;
  confirmed: boolean;
};

export type KeysRecord = Record<string, KeyCacheEntry>;

export enum KeyCacheStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
}
