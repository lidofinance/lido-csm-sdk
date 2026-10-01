import { describe, expect, it, vi } from 'vitest';
import { AccountingSDK } from '../../../src/accounting-sdk/accounting-sdk';

const makeSdk = (skipHistoricalCalls: boolean) => {
  let ether = 100n;
  const read = {
    getTotalPooledEther: vi.fn(async () => ether),
    getTotalShares: vi.fn(async () => 50n),
  };
  const core = {
    skipHistoricalCalls,
    getContractWithAbi: () => ({ read }),
  } as any;
  return {
    sdk: new AccountingSDK({ core }),
    read,
    setEther: (v: bigint) => (ether = v),
  };
};

describe('AccountingSDK.getStethPoolData', () => {
  it('caches historical block reads forever', async () => {
    const { sdk, read } = makeSdk(false);
    await sdk.getStethPoolData(5n);
    await sdk.getStethPoolData(5n);
    expect(read.getTotalPooledEther).toHaveBeenCalledTimes(1);
    expect(read.getTotalPooledEther).toHaveBeenCalledWith({ blockNumber: 5n });
  });

  it('does not cache latest reads across calls', async () => {
    const { sdk, read, setEther } = makeSdk(false);
    await sdk.getStethPoolData();
    setEther(200n);
    const data = await sdk.getStethPoolData();
    expect(data.totalPooledEther).toBe(200n);
    expect(read.getTotalPooledEther).toHaveBeenCalledTimes(2);
  });

  it('shares concurrent latest reads', async () => {
    const { sdk, read } = makeSdk(false);
    await Promise.all([sdk.getStethPoolData(), sdk.getStethPoolData()]);
    expect(read.getTotalPooledEther).toHaveBeenCalledTimes(1);
  });

  it('skipHistoricalCalls routes a block to the latest path', async () => {
    const { sdk, read, setEther } = makeSdk(true);
    await sdk.getStethPoolData(5n);
    setEther(200n);
    const data = await sdk.getStethPoolData(5n);
    expect(data.totalPooledEther).toBe(200n);
    expect(read.getTotalPooledEther).toHaveBeenLastCalledWith({
      blockNumber: undefined,
    });
  });
});
