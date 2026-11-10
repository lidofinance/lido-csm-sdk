import { describe, expect, it } from 'vitest';
import { CsmSDKModule } from '../../src/common/class-primitives/csm-sdk-module';
import { EstimateView } from '../../src/common/decorators/estimate-view';

type FakeWalletClient = { account?: { address: string } };

class Service extends CsmSDKModule {
  calls = 0;

  constructor(wallet: { current?: FakeWalletClient } = {}) {
    super({
      core: {
        logMode: 'none',
        core: {
          get walletClient() {
            return wallet.current;
          },
        },
      } as never,
    });
  }

  @EstimateView()
  async estimateThing(_props: { account?: string }) {
    this.calls += 1;
    await Promise.resolve();
    return this.calls;
  }
}

describe('EstimateView', () => {
  it('shares concurrent calls for the same account', async () => {
    const s = new Service({ current: { account: { address: '0x1' } } });
    const [a, b] = await Promise.all([
      s.estimateThing({}),
      s.estimateThing({}),
    ]);
    expect(a).toBe(b);
    expect(s.calls).toBe(1);
  });

  it('does not share when the wallet account changes and account prop is omitted', async () => {
    const wallet = { current: { account: { address: '0x1' } } };
    const s = new Service(wallet);
    const first = s.estimateThing({});
    wallet.current = { account: { address: '0x2' } };
    const second = s.estimateThing({});
    await Promise.all([first, second]);
    expect(s.calls).toBe(2);
  });

  it('handles a missing wallet account', async () => {
    const s = new Service();
    await expect(s.estimateThing({})).resolves.toBe(1);
  });
});
