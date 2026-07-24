import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';
import { TOKENS } from '../../../src/common/constants/tokens';

// `signPermitOrApprove` is the branch point between the EIP-2612 permit flow
// (EOA) and the explicit-approve flow (multisig). It's the single most
// critical routing decision in the tx-sdk for non-AA wallets.

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

const buildTx = (overrides: { allowance: bigint; isMultisig: boolean }) => {
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
  const invalidateCache = vi.fn();

  const fakeCore = {
    chainId: 560_048,
    chain: { id: 560_048 },
    getContractAddress: () => SPENDER,
    getContract: () => ({
      address: STETH,
      read: { allowance: allowanceRead },
      // 0x095ea7b3 = keccak256("approve(address,uint256)")[0:4]. Using the
      // real selector keeps the mock from silently lying if a future test
      // ever asserts on the encoded calldata.
      encode: { approve: () => ({ to: STETH, data: '0x095ea7b3' }) },
    }),
    core: {
      // Mirror production LidoSDKCore.useAccount: an Address string is
      // normalized into {address, type: 'json-rpc'} (see lido-ethereum-sdk
      // core.ts:367-391). The previous mock returned the raw string, which
      // only worked because every downstream mock ignored its arguments.
      useAccount: async (a: unknown) =>
        typeof a === 'string'
          ? { address: a as `0x${string}`, type: 'json-rpc' as const }
          : (a ?? { address: ACCOUNT, type: 'json-rpc' as const }),
      isContract,
      signPermit,
      getFeeData,
      error: (props: { code: string; message: string }) =>
        Object.assign(new Error(props.message), props),
    },
    walletClient: { sendTransaction },
    publicClient: {
      waitForTransactionReceipt,
      getTransactionConfirmations,
      estimateGas,
    },
    invalidateCache,
  };

  const tx = new TxSDK({ core: fakeCore as never });
  return { tx, signPermit, sendTransaction, allowanceRead };
};

const spend = { token: TOKENS.steth, amount: 5n } as const;

describe('TxSDK.signPermitOrApprove (EOA / multisig branch)', () => {
  describe('when allowance already covers the spend', () => {
    it('returns an empty permit without signing or approving', async () => {
      const { tx, signPermit, sendTransaction } = buildTx({
        allowance: 100n,
        isMultisig: false,
      });
      const result = await tx.signPermitOrApprove({
        account: ACCOUNT,
        spend,
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
      const { tx, signPermit, sendTransaction } = buildTx({
        allowance: 0n,
        isMultisig: false,
      });
      const result = await tx.signPermitOrApprove({
        account: ACCOUNT,
        spend,
      });
      expect(signPermit).toHaveBeenCalledTimes(1);
      expect(sendTransaction).not.toHaveBeenCalled();
      expect(result.permit).toEqual(
        expect.objectContaining({ value: PERMIT_SIG.value }),
      );
      expect((result as { hash?: string }).hash).toBeUndefined();
    });
  });

  describe('multisig path (allowance insufficient, contract account)', () => {
    it('sends an approve transaction instead of signing a permit', async () => {
      const { tx, signPermit, sendTransaction } = buildTx({
        allowance: 0n,
        isMultisig: true,
      });
      const result = await tx.signPermitOrApprove({
        account: ACCOUNT,
        spend,
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
});
