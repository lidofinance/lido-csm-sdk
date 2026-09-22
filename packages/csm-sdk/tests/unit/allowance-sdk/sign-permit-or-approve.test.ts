import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { getContract } from 'viem';
import { AllowanceSDK } from '../../../src/allowance-sdk/allowance-sdk';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';
import { TOKENS } from '../../../src/common/constants/tokens';

vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  getContract: vi.fn(),
}));

vi.mock('@lidofinance/lido-ethereum-sdk', async (orig) => ({
  ...(await orig<typeof import('@lidofinance/lido-ethereum-sdk')>()),
  getEncodableContract: (c: unknown) => c,
}));

// `signPermitOrApprove` is the branch point between the EIP-2612 permit flow
// (EOA) and the explicit-approve flow (multisig). It's the single most
// critical routing decision in the allowance-sdk for non-AA wallets.

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SPENDER: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const STETH: Address = '0xcccccccccccccccccccccccccccccccccccccccc';
const APPROVE_TX_HASH = '0xdeadbeef';
const PERMIT_SIG = {
  deadline: 1n,
  v: 27,
  r: '0x' + '11'.repeat(32),
  s: '0x' + '22'.repeat(32),
  value: 5n,
  nonce: 0n,
  owner: ACCOUNT,
  spender: SPENDER,
  chainId: 560_048n,
} as const;

const buildAllowance = (overrides: {
  allowance: bigint;
  isMultisig: boolean;
}) => {
  const signPermit = vi.fn(async () => PERMIT_SIG);
  const allowanceRead = vi.fn(async () => overrides.allowance);
  const sendTransaction = vi.fn(async () => APPROVE_TX_HASH);
  const estimateGas = vi.fn(async () => 100_000n);
  const getFeeData = vi.fn(async () => ({
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  }));
  const waitForTransactionReceipt = vi.fn(async () => ({
    status: 'success',
    transactionHash: APPROVE_TX_HASH,
    logs: [],
  }));
  const isContract = vi.fn(async () => overrides.isMultisig);
  const getTransactionConfirmations = vi.fn(async () => 1n);

  const fakeCore = {
    chain: { id: 560_048 },
    // Mirror production LidoSDKCore.useAccount: an Address string is
    // normalized into {address, type: 'json-rpc'} (see lido-ethereum-sdk
    // core.ts:367-391).
    useAccount: async (a: unknown) =>
      typeof a === 'string'
        ? { address: a as `0x${string}`, type: 'json-rpc' as const }
        : (a ?? { address: ACCOUNT, type: 'json-rpc' as const }),
    isContract,
    signPermit,
    getFeeData,
    useWalletClient: () => ({ sendTransaction }),
    publicClient: {
      waitForTransactionReceipt,
      getTransactionConfirmations,
      estimateGas,
    },
    keyedClient: {},
  };

  vi.mocked(getContract).mockReturnValue({
    address: STETH,
    read: { allowance: allowanceRead },
    // 0x095ea7b3 = keccak256("approve(address,uint256)")[0:4]. Using the
    // real selector keeps the mock from silently lying if a future test
    // ever asserts on the encoded calldata.
    encode: { approve: () => ({ to: STETH, data: '0x095ea7b3' }) },
  } as never);

  const wallet = new WalletSDK({ core: fakeCore as never });
  const sdk = new AllowanceSDK({ core: fakeCore as never, wallet });
  return { sdk, signPermit, sendTransaction, allowanceRead };
};

const spend = { token: TOKENS.steth, amount: 5n } as const;

describe('AllowanceSDK.signPermitOrApprove (EOA / multisig branch)', () => {
  describe('when allowance already covers the spend', () => {
    it('returns an empty permit without signing or approving', async () => {
      const { sdk, signPermit, sendTransaction } = buildAllowance({
        allowance: 100n,
        isMultisig: false,
      });
      const result = await sdk.signPermitOrApprove({
        account: ACCOUNT,
        spend,
        spender: SPENDER,
      });
      expect(result.permit).toEqual(
        expect.objectContaining({ value: 0n, deadline: 0n }),
      );
      expect(signPermit).not.toHaveBeenCalled();
      expect(sendTransaction).not.toHaveBeenCalled();
    });
  });

  describe('EOA path (allowance insufficient, not multisig)', () => {
    it('signs an EIP-2612 permit', async () => {
      const { sdk, signPermit, sendTransaction } = buildAllowance({
        allowance: 0n,
        isMultisig: false,
      });
      const result = await sdk.signPermitOrApprove({
        account: ACCOUNT,
        spend,
        spender: SPENDER,
      });
      expect(signPermit).toHaveBeenCalledTimes(1);
      expect(signPermit).toHaveBeenCalledWith(
        expect.objectContaining({ spender: SPENDER }),
      );
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(result.permit).toEqual(
        expect.objectContaining({ value: PERMIT_SIG.value }),
      );
      expect((result as { hash?: string }).hash).toBeUndefined();
    });
  });

  describe('multisig path (allowance insufficient, contract account)', () => {
    it('sends an approve transaction instead of signing a permit', async () => {
      const { sdk, signPermit, sendTransaction } = buildAllowance({
        allowance: 0n,
        isMultisig: true,
      });
      const result = await sdk.signPermitOrApprove({
        account: ACCOUNT,
        spend,
        spender: SPENDER,
      });
      expect(signPermit).not.toHaveBeenCalled();
      expect(sendTransaction).toHaveBeenCalledTimes(1);
      expect((result as { hash?: string }).hash).toBe(APPROVE_TX_HASH);
      // Returns EMPTY_PERMIT so the downstream call has no signature attached
      expect(result.permit).toEqual(
        expect.objectContaining({ value: 0n, deadline: 0n }),
      );
    });
  });

  describe('zero-amount spend (e.g. a zero-quote token addition)', () => {
    it('skips permit signing and approving regardless of allowance or account type', async () => {
      const { sdk, signPermit, sendTransaction, allowanceRead } =
        buildAllowance({
          allowance: 0n,
          isMultisig: false,
        });
      const result = await sdk.signPermitOrApprove({
        account: ACCOUNT,
        spend: { token: TOKENS.steth, amount: 0n },
        spender: SPENDER,
      });
      expect(allowanceRead).not.toHaveBeenCalled();
      expect(signPermit).not.toHaveBeenCalled();
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(result.permit).toEqual(
        expect.objectContaining({ value: 0n, deadline: 0n }),
      );
    });
  });
});
