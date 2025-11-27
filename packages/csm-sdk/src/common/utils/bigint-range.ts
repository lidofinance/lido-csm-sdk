export const bigIntRange = function* (count: bigint): Generator<bigint> {
  for (let i = 0n; i < count; i++) {
    yield i;
  }
};
