export abstract class CsmSDKCacheable {
  protected accessor cache = new Map<
    string,
    { data: any; timestamp: number; isPromise?: boolean }
  >();
}
