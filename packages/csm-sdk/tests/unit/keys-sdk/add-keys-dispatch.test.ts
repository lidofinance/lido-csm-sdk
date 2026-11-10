import { describe, expect, it, vi } from 'vitest';
import { KeysSDK } from '../../../src/keys-sdk/keys-sdk';
import { TOKENS } from '../../../src/common/constants/tokens';

// A zero amount must not swap the token: stETH calldata carries no amount, so a
// pre-existing allowance could cover a live requirement > 0 (VKP-BOND-01).

type Builder = 'buildAddKeysETH' | 'buildAddKeysStETH' | 'buildAddKeysWstETH';

const buildKeys = () => {
  const perform = vi.fn().mockResolvedValue({});
  const estimate = vi.fn().mockResolvedValue({});
  const keys = new KeysSDK({
    core: {} as never,
    bus: { tx: { perform, estimate } },
  } as never);
  const spy = (method: Builder) =>
    vi
      .spyOn(keys as unknown as Record<Builder, () => Promise<unknown>>, method)
      .mockResolvedValue({});

  return {
    keys,
    spies: {
      [TOKENS.eth]: spy('buildAddKeysETH'),
      [TOKENS.steth]: spy('buildAddKeysStETH'),
      [TOKENS.wsteth]: spy('buildAddKeysWstETH'),
    },
  };
};

describe.each(['addKeys', 'estimateAddKeys'] as const)(
  'KeysSDK.%s with amount=0n',
  (method) => {
    it.each([TOKENS.eth, TOKENS.steth, TOKENS.wsteth])(
      'dispatches %s to its own builder',
      async (token) => {
        const { keys, spies } = buildKeys();

        await keys[method]({
          nodeOperatorId: 1n,
          amount: 0n,
          depositData: [],
          token,
        });

        const called = Object.entries(spies)
          .filter(([, spy]) => spy.mock.calls.length > 0)
          .map(([name]) => name);

        expect(called).toEqual([token]);
      },
    );
  },
);
