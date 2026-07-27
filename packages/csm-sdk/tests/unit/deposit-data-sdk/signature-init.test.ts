import { ByteVectorType, ContainerType, UintBigintType } from '@chainsafe/ssz';
import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hexToBytes, toHex, type Hex } from 'viem';
import type {
  DepositData,
  ValidationProps,
} from '../../../src/deposit-data-sdk/types';

vi.mock('bls-eth-wasm', async (importOriginal) => {
  const actual = await importOriginal<
    Record<string, unknown> & { default?: Record<string, unknown> }
  >();
  // `bls-eth-wasm` is CJS: the object returned as `default` is the very
  // instance its own internals (PublicKey/Signature classes, etc.) close
  // over, so it must be mutated in place rather than shallow-copied —
  // otherwise post-init state assigned onto it is invisible to consumers
  // holding this mocked reference.
  const actualDefault = actual.default ?? actual;
  const realInit = actualDefault.init as (curveType: number) => Promise<void>;
  const init = vi.fn((curveType: number) => realInit(curveType));
  actualDefault.init = init;
  return { ...actual, default: actualDefault, init };
});

const DepositMessageSSZ = new ContainerType({
  pubkey: new ByteVectorType(48),
  withdrawal_credentials: new ByteVectorType(32),
  amount: new UintBigintType(8),
});

const computeDepositMessageRoot = (item: DepositData): Hex =>
  toHex(
    DepositMessageSSZ.hashTreeRoot({
      pubkey: hexToBytes(item.pubkey),
      withdrawal_credentials: hexToBytes(item.withdrawal_credentials),
      amount: BigInt(item.amount),
    }),
  );

const WC_PREFIX = '010000000000000000000000';

const config: ValidationProps = {
  chainId: CHAINS.Mainnet,
  withdrawalCredentials: `0x${'ef'.repeat(20)}` as Hex,
  wcPrefix: WC_PREFIX,
};

const buildBasicValidItem = (pubkeySuffix: string): DepositData => {
  const item: DepositData = {
    pubkey: `0x${'ab'.repeat(47)}${pubkeySuffix}` as Hex,
    withdrawal_credentials: `0x${WC_PREFIX}${'ef'.repeat(20)}` as Hex,
    amount: 32_000_000_000,
    signature: `0x${'cd'.repeat(96)}` as Hex,
    deposit_message_root: '0x' as Hex,
    deposit_data_root: `0x${'34'.repeat(32)}` as Hex,
    fork_version: '0x00000000',
    network_name: 'mainnet',
    deposit_cli_version: '2.3.0',
  };
  item.deposit_message_root = computeDepositMessageRoot(item);
  return item;
};

const buildBatch = (size: number): DepositData[] =>
  Array.from({ length: size }, (_, i) =>
    buildBasicValidItem(i.toString(16).padStart(2, '0')),
  );

beforeEach(() => {
  vi.resetModules();
});

describe('BLS init memoization', () => {
  it('calls bls.init exactly once per batch', async () => {
    const bls = await import('bls-eth-wasm');
    const initSpy = vi.mocked(bls.init);

    const { validateDepositData } =
      await import('../../../src/deposit-data-sdk/validator');

    await validateDepositData(buildBatch(10), config);

    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('reports BLS_VERIFICATION_UNAVAILABLE on init failure and resets the memo for the next call', async () => {
    const bls = await import('bls-eth-wasm');
    const initSpy = vi.mocked(bls.init);
    initSpy.mockRejectedValueOnce(new Error('wasm OOM'));

    const { validateDepositData } =
      await import('../../../src/deposit-data-sdk/validator');

    const batch = buildBatch(10);

    // An init failure never rejects the batch: every item's verification is
    // reported as unavailable rather than the whole call throwing.
    const firstErrors = await validateDepositData(batch, config);
    const unavailableCount = firstErrors.filter(
      (e) => e.code === 'BLS_VERIFICATION_UNAVAILABLE',
    ).length;
    expect(unavailableCount).toBe(batch.length);

    const secondErrors = await validateDepositData(batch, config);
    const blsErrorCount = secondErrors.filter(
      (e) => e.code === 'INVALID_BLS_SIGNATURE',
    ).length;

    expect(blsErrorCount).toBe(batch.length);
  });
});
