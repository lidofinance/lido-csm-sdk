import { vi } from 'vitest';
import type { Address } from 'viem';
import { getContract } from 'viem';
import { AllowanceSDK } from '../../../src/allowance-sdk/allowance-sdk';
import { BusRegistry } from '../../../src/common/class-primitives/bus-registry';
import { CONTRACT_NAMES } from '../../../src/common/constants/contract-names';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';

// Callers must vi.mock viem.getContract and getEncodableContract (see perform-routing.test.ts).

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const SPENDER: Address = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const STETH: Address = '0xcccccccccccccccccccccccccccccccccccccccc';
const TARGET: Address = '0xdddddddddddddddddddddddddddddddddddddddd';
export const TX_HASH = '0x' + '11'.repeat(32);
export const APPROVE_HASH = '0x' + '22'.repeat(32);
export const CHAIN_ID = 560_048;
export const APPROVE_CALL = { to: STETH, data: '0x095ea7b3' };
export const MAIN_CALL = { to: TARGET, data: '0xabcdef' };
export const SIGNED_PERMIT = {
  deadline: 1n,
  v: 27,
  r: '0x' + '11'.repeat(32),
  s: '0x' + '22'.repeat(32),
  value: 5n,
  nonce: 0n,
  owner: ACCOUNT,
  spender: SPENDER,
  chainId: BigInt(CHAIN_ID),
} as const;
export const GIVEN_PERMIT = { ...SIGNED_PERMIT, v: 28, value: 7n };

export type Kind = 'eoa' | 'multisig' | 'atomicBatch';

export const build = (kind: Kind, allowance = 0n) => {
  const hashes = [APPROVE_HASH, TX_HASH];
  const sendTransaction = vi.fn(async (_args: unknown) => hashes.shift()!);
  const estimateGas = vi.fn(async () => 100_000n);
  const sendCalls = vi.fn(async (_args: unknown) => ({ id: 'call-1' }));
  const waitForCallsStatus = vi.fn(async () => ({
    status: 'success',
    receipts: [{ status: 'success', transactionHash: TX_HASH }],
  }));
  const getCapabilities = vi.fn(async () =>
    kind === 'atomicBatch'
      ? { [CHAIN_ID]: { atomic: { status: 'supported' } } }
      : {},
  );
  const signPermit = vi.fn(async () => SIGNED_PERMIT);
  const waitForTransactionReceipt = vi.fn(async () => ({
    status: 'success',
    transactionHash: TX_HASH,
    logs: [],
  }));
  const isContract = vi.fn(async () => kind !== 'eoa');

  const lido = {
    chain: { id: CHAIN_ID },
    useAccount: async (a: unknown) =>
      (a as object | undefined) ?? { address: ACCOUNT },
    isContract,
    signPermit,
    getFeeData: async () => ({ maxFeePerGas: 2n, maxPriorityFeePerGas: 2n }),
    useWalletClient: () => ({
      sendTransaction,
      sendCalls,
      waitForCallsStatus,
      getCapabilities,
    }),
    publicClient: {
      estimateGas,
      waitForTransactionReceipt,
      getTransactionConfirmations: async () => 1n,
    },
    keyedClient: {},
  };
  const csmCore = {
    core: lido,
    getContractAddress: () => SPENDER,
    getContractNameByAddress: () => undefined,
  };

  const encodeApprove = vi.fn((_args: unknown) => APPROVE_CALL);
  vi.mocked(getContract).mockReturnValue({
    address: STETH,
    read: { allowance: vi.fn(async () => allowance) },
    encode: { approve: encodeApprove },
  } as never);

  const wallet = new WalletSDK({ core: lido as never });
  const allowanceSdk = new AllowanceSDK({
    core: lido as never,
    wallet,
    tokenAddresses: { [CONTRACT_NAMES.stETH]: STETH },
  });
  const bus = new BusRegistry<{ wallet: object; allowance: object }>();
  bus.register(wallet, 'wallet');
  bus.register(allowanceSdk, 'allowance');
  const tx = new TxSDK({ core: csmCore as never, bus: bus as never });
  const getWalletKind = vi.spyOn(wallet, 'getWalletKind');

  return {
    tx,
    allowanceSdk,
    getWalletKind,
    encodeApprove,
    sendTransaction,
    sendCalls,
    signPermit,
    estimateGas,
    waitForTransactionReceipt,
  };
};
