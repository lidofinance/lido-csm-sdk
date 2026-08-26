export type CacheEntry = {
  data: any;
  timestamp: number;
  version?: number;
  async?: boolean;
};

export abstract class CsmSDKCacheable {
  abstract get cacheVersion(): number;

  protected accessor cache = new Map<string, CacheEntry>();
}
