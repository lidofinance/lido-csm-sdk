import { describe, expect, it, vi } from 'vitest';
import { KeysSDK } from '../../../src/keys-sdk/keys-sdk';
import { TOKENS } from '../../../src/common/constants/tokens';

// A zero amount must not swap the token: stETH calldata carries no amount, so a
// pre-existing allowance could cover a live requirement > 0 (VKP-BOND-01).

const buildKeys = () => {
  const keys = new KeysSDK({ core: {} as never });
  const spy = (method: 'addKeysETH' | 'addKeysStETH' | 'addKeysWstETH') =>
    vi.spyOn(keys, method).mockResolvedValue({} as never);

  return {
    keys,
    spies: {
      [TOKENS.eth]: spy('addKeysETH'),
      [TOKENS.steth]: spy('addKeysStETH'),
      [TOKENS.wsteth]: spy('addKeysWstETH'),
    },
  };
};

describe('KeysSDK.addKeys with amount=0n', () => {
  it.each([TOKENS.eth, TOKENS.steth, TOKENS.wsteth])(
    'dispatches %s to its own method',
    async (token) => {
      const { keys, spies } = buildKeys();

      await keys.addKeys({
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
});
