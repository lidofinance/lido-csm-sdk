import { describe, it, expect, vi } from 'vitest';
import { requestWithBlockStep } from '../../../src/common/utils/request-with-block-step';

describe('requestWithBlockStep', () => {
  it('splits range into chunks of step size', () => {
    const request = vi.fn(({ fromBlock, toBlock }) => ({ fromBlock, toBlock }));

    const result = requestWithBlockStep(
      { step: 100, fromBlock: 0n, toBlock: 250n },
      request,
    );

    expect(result).toEqual([
      { fromBlock: 0n, toBlock: 100n },
      { fromBlock: 101n, toBlock: 201n },
      { fromBlock: 202n, toBlock: 250n },
    ]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('clamps last chunk to toBlock', () => {
    const request = vi.fn(({ fromBlock, toBlock }) => ({ fromBlock, toBlock }));

    const result = requestWithBlockStep(
      { step: 1000, fromBlock: 0n, toBlock: 500n },
      request,
    );

    expect(result).toEqual([{ fromBlock: 0n, toBlock: 500n }]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('handles exact step boundary', () => {
    const request = vi.fn(({ fromBlock, toBlock }) => ({ fromBlock, toBlock }));

    requestWithBlockStep({ step: 100, fromBlock: 0n, toBlock: 100n }, request);

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith({ fromBlock: 0n, toBlock: 100n });
  });

  it('handles single block range', () => {
    const request = vi.fn(({ fromBlock, toBlock }) => ({ fromBlock, toBlock }));

    const result = requestWithBlockStep(
      { step: 100, fromBlock: 5n, toBlock: 5n },
      request,
    );

    expect(result).toEqual([{ fromBlock: 5n, toBlock: 5n }]);
  });
});
