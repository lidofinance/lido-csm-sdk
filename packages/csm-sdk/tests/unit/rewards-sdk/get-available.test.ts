import { describe, expect, it, vi } from 'vitest';
import { RewardsSDK } from '../../../src/rewards-sdk/rewards-sdk';
import { SDKError } from '../../../src/common/utils/sdk-error';

// An empty proof means nothing to claim; a failed lookup must not look the same
// (CSMW-OA-SPLIT-01).

const buildRewards = (getFeesToDistribute: () => Promise<bigint>) => {
  const core = {
    getContract: () => ({ read: { getFeesToDistribute } }),
  };

  const rewards = new RewardsSDK({ core: core as never });
  rewards.bus.register(
    { sharesToEth: async (shares: bigint) => shares } as never,
    'accounting',
  );

  return rewards;
};

const PROOF = { proof: ['0xaa'], shares: 5n } as never;

describe('RewardsSDK.getAvailable', () => {
  it('returns 0n without a contract lookup when the proof is empty', async () => {
    const getFeesToDistribute = vi.fn();
    const rewards = buildRewards(getFeesToDistribute);

    const result = await rewards.getAvailable(1n, { proof: [], shares: 0n });

    expect(result).toBe(0n);
    expect(getFeesToDistribute).not.toHaveBeenCalled();
  });

  it('rethrows a lookup failure as SDKError instead of returning 0n', async () => {
    const rewards = buildRewards(() =>
      Promise.reject(new Error('proof invalid')),
    );

    await expect(rewards.getAvailable(1n, PROOF)).rejects.toThrow(SDKError);
  });

  it('returns the converted amount when the lookup succeeds', async () => {
    const rewards = buildRewards(async () => 10n);

    expect(await rewards.getAvailable(1n, PROOF)).toBe(10n);
  });
});
