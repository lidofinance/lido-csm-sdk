export abstract class CsmSDKCacheable {
  private static _cacheVersion = 0;

  static get cacheVersion() {
    return CsmSDKCacheable._cacheVersion;
  }

  static invalidateCache() {
    CsmSDKCacheable._cacheVersion++;
  }

  protected accessor cache = new Map<
    string,
    { data: any; timestamp: number; isPromise?: boolean; version?: number }
  >();
}
