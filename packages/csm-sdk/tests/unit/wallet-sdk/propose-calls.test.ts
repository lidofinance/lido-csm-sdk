import { describe, expect, it, vi } from 'vitest';
import {
  getAddress,
  UnknownRpcError,
  UserRejectedRequestError,
  type Address,
  type Hex,
} from 'viem';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error';
import { TransactionCallbackStage } from '../../../src/tx-sdk/types';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TARGET: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const SAFE_TX_HASH: Hex = `0x${'33'.repeat(32)}`;
const CALLS = [{ to: TARGET, data: '0xabcdef' as Hex }];
const S = TransactionCallbackStage;

const build = () => {
  const chain = { id: 560_048 };
  const sendCalls = vi.fn(async (_args: unknown) => ({ id: SAFE_TX_HASH }));
  const waitForCallsStatus = vi.fn();
  const core = {
    chain,
    useAccount: async () => ({ address: ACCOUNT, type: 'json-rpc' }),
    useWalletClient: () => ({ sendCalls, waitForCallsStatus }),
    publicClient: { getTransactionConfirmations: vi.fn() },
  };
  return {
    wallet: new WalletSDK({ core: core as never }),
    chain,
    sendCalls,
    waitForCallsStatus,
  };
};

const propose = (wallet: WalletSDK, extra: Record<string, unknown> = {}) =>
  wallet.proposeCalls({ calls: CALLS, ...extra } as never);

describe('WalletSDK.proposeCalls', () => {
  it('proposes from the checksummed address on the core chain with fallback off', async () => {
    const { wallet, chain, sendCalls } = build();
    await propose(wallet);
    expect(sendCalls).toHaveBeenCalledWith({
      account: getAddress(ACCOUNT),
      chain,
      calls: CALLS,
      experimental_fallback: false,
    });
  });

  it('returns the call id as hash without waiting or decoding', async () => {
    const { wallet, waitForCallsStatus } = build();
    const decodeResult = vi.fn();
    const result = await propose(wallet, { decodeResult });
    expect(result).toEqual({ hash: SAFE_TX_HASH });
    expect(waitForCallsStatus).not.toHaveBeenCalled();
    expect(decodeResult).not.toHaveBeenCalled();
  });

  it('fires SIGN then MULTISIG_DONE with the hash', async () => {
    const { wallet } = build();
    const callback = vi.fn();
    await propose(wallet, { callback });
    expect(callback.mock.calls.map(([a]) => a)).toEqual([
      { stage: S.SIGN, payload: { gas: undefined } },
      { stage: S.MULTISIG_DONE, payload: { hash: SAFE_TX_HASH } },
    ]);
  });

  it.each([
    ['wallet 4001', new UserRejectedRequestError(new Error('User rejected'))],
    ['Safe iframe', new UnknownRpcError(new Error('Transaction was rejected'))],
  ])(
    'maps a %s rejection to USER_REJECTED without MULTISIG_DONE',
    async (_label, error) => {
      const { wallet, sendCalls } = build();
      sendCalls.mockRejectedValueOnce(error);
      const callback = vi.fn();
      await expect(propose(wallet, { callback })).rejects.toMatchObject({
        code: ERROR_CODE.USER_REJECTED,
      });
      expect(callback.mock.calls.map(([a]) => a.stage)).toEqual([S.SIGN]);
    },
  );
});
