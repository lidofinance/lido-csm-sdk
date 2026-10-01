import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTree } from '../../../src/common/utils/index';
import { RewardsSDK } from '../../../src/rewards-sdk/rewards-sdk';

vi.mock('../../../src/common/utils/index', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchTree: vi.fn(async (args: { root: string }) => ({ root: args.root })),
}));

const build = () => {
  const history = [{ treeCid: 'cid-0', treeRoot: '0xaa' }];
  const read = {
    distributionDataHistoryCount: async () => BigInt(history.length),
    getHistoricalDistributionData: async ([n]: [bigint]) => history[Number(n)],
  };
  const core = {
    getContract: () => ({ read }),
    getIpfsUrls: (cid: string) => [`ipfs://${cid}`],
    getMerkleTreeFallback: () => undefined,
  };
  const rewards = new RewardsSDK({ core: core as never });
  return { rewards, history };
};

describe('RewardsSDK.getProofTree', () => {
  beforeEach(() => {
    vi.mocked(fetchTree).mockClear();
  });

  it('fetches once for the same CID', async () => {
    const { rewards } = build();

    await rewards.getProofTree();
    await rewards.getProofTree();

    expect(fetchTree).toHaveBeenCalledTimes(1);
  });

  it('fetches the new tree when CID and root change', async () => {
    const { rewards, history } = build();

    await rewards.getProofTree();
    history.push({ treeCid: 'cid-1', treeRoot: '0xbb' });
    const tree = await rewards.getProofTree();

    expect(fetchTree).toHaveBeenCalledTimes(2);
    expect(fetchTree).toHaveBeenLastCalledWith(
      expect.objectContaining({ urls: ['ipfs://cid-1'], root: '0xbb' }),
    );
    expect(tree).toEqual({ root: '0xbb' });
  });
});
