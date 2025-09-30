export type KeysRecord = Record<string, number>; // pubkey -> timestamp

export interface KeysCacheResult {
  success: boolean;
  error?: string;
}
