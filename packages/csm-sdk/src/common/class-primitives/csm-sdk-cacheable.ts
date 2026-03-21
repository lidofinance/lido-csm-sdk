export abstract class CsmSDKCacheable {
  abstract get cacheVersion(): number;

  protected accessor cache = new Map<
    string,
    { data: any; timestamp: number; version?: number }
  >();
}
