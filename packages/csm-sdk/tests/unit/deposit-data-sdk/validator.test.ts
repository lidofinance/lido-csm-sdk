import { ByteVectorType, ContainerType, UintBigintType } from '@chainsafe/ssz';
import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it, vi } from 'vitest';
import { hexToBytes, toHex, type Hex } from 'viem';
import * as signatureModule from '../../../src/deposit-data-sdk/signature';
import { validateDepositData } from '../../../src/deposit-data-sdk/validator';
import {
  DepositData,
  ValidationErrorCode,
  ValidationProps,
} from '../../../src/deposit-data-sdk/types';

vi.mock('../../../src/deposit-data-sdk/signature', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../src/deposit-data-sdk/signature')
    >();
  return {
    ...actual,
    verifyDepositSignature: vi.fn(actual.verifyDepositSignature),
  };
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
const WITHDRAWAL_VAULT = `0x${'ef'.repeat(20)}` as Hex;

const config: ValidationProps = {
  chainId: CHAINS.Mainnet,
  withdrawalCredentials: WITHDRAWAL_VAULT,
  wcPrefix: WC_PREFIX,
};

// Passes every basic check, but `signature` is not a real BLS signature, so
// BLS verification fails while every cheap field check passes.
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

const BAD_SIGNATURE_ITEM = buildBasicValidItem('00');

const hasBlsError = (errors: { code: ValidationErrorCode }[]) =>
  errors.some((e) => e.code === ValidationErrorCode.INVALID_BLS_SIGNATURE);

describe('validateDepositData — skipSignature', () => {
  it('flags INVALID_BLS_SIGNATURE by default', async () => {
    const errors = await validateDepositData([BAD_SIGNATURE_ITEM], config);
    expect(hasBlsError(errors)).toBe(true);
  });

  it('skips BLS verification when skipSignature is true', async () => {
    const errors = await validateDepositData([BAD_SIGNATURE_ITEM], {
      ...config,
      skipSignature: true,
    });
    expect(hasBlsError(errors)).toBe(false);
  });

  it('still runs the hex-format signature check when skipSignature is true', async () => {
    const malformed: DepositData = {
      ...BAD_SIGNATURE_ITEM,
      signature: '0xnothex',
    };
    const errors = await validateDepositData([malformed], {
      ...config,
      skipSignature: true,
    });
    expect(
      errors.some((e) => e.code === ValidationErrorCode.INVALID_SIGNATURE),
    ).toBe(true);
  });
});

describe('validateDepositData — BLS skipped for basic-invalid items', () => {
  it('does not run BLS verification for items that failed basic validation', async () => {
    const spy = vi.mocked(signatureModule.verifyDepositSignature);
    spy.mockClear();

    const badNetworkItem: DepositData = {
      ...buildBasicValidItem('01'),
      network_name: 'hoodi',
      signature: `0x${'00'.repeat(96)}` as Hex,
    };

    const errors = await validateDepositData(
      [badNetworkItem, BAD_SIGNATURE_ITEM],
      config,
    );

    expect(
      errors.some(
        (e) =>
          e.index === 0 && e.code === ValidationErrorCode.INVALID_BLS_SIGNATURE,
      ),
    ).toBe(false);
    expect(
      errors.some(
        (e) => e.index === 0 && e.code === ValidationErrorCode.INVALID_NETWORK,
      ),
    ).toBe(true);
    expect(
      errors.some(
        (e) =>
          e.index === 1 && e.code === ValidationErrorCode.INVALID_BLS_SIGNATURE,
      ),
    ).toBe(true);

    const calledWith = spy.mock.calls.map(([data]) => data);
    expect(calledWith).not.toContain(badNetworkItem);
    expect(calledWith).toContain(BAD_SIGNATURE_ITEM);
  });
});

describe('validateDepositData — index preservation across chunks', () => {
  it('preserves original indices across chunked BLS verification', async () => {
    const items = Array.from({ length: 120 }, (_, i) =>
      buildBasicValidItem(i.toString(16).padStart(2, '0')),
    );

    const errors = await validateDepositData(items, config);
    const blsErrors = errors.filter(
      (e) => e.code === ValidationErrorCode.INVALID_BLS_SIGNATURE,
    );

    expect(blsErrors).toHaveLength(120);
    expect(blsErrors.map((e) => e.index).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 120 }, (_, i) => i),
    );
  });
});

describe('validateDepositData — BLS infrastructure failure', () => {
  it('resolves with BLS_VERIFICATION_UNAVAILABLE for every item when verifyDepositSignature rejects for all', async () => {
    const spy = vi.mocked(signatureModule.verifyDepositSignature);
    const realImplementation = spy.getMockImplementation()!;
    spy.mockRejectedValue(new Error('WASM init failed'));

    const badNetworkItem: DepositData = {
      ...buildBasicValidItem('02'),
      network_name: 'hoodi',
    };
    const goodItem = buildBasicValidItem('03');

    const errors = await validateDepositData(
      [badNetworkItem, goodItem],
      config,
    );

    // Basic-validation error is still present alongside the BLS fallout.
    expect(
      errors.some(
        (e) => e.index === 0 && e.code === ValidationErrorCode.INVALID_NETWORK,
      ),
    ).toBe(true);

    const unavailableErrors = errors.filter(
      (e) => e.code === ValidationErrorCode.BLS_VERIFICATION_UNAVAILABLE,
    );
    // badNetworkItem already failed basic validation, so it's skipped for
    // BLS verification — only goodItem gets a verify attempt.
    expect(unavailableErrors).toHaveLength(1);
    expect(unavailableErrors[0]!.index).toBe(1);

    spy.mockImplementation(realImplementation);
  });

  it('flags only the rejected item with BLS_VERIFICATION_UNAVAILABLE, leaving others unaffected', async () => {
    const spy = vi.mocked(signatureModule.verifyDepositSignature);
    const realImplementation = spy.getMockImplementation()!;
    const okItem = buildBasicValidItem('04');
    const rejectingItem = buildBasicValidItem('05');

    spy.mockImplementation((data, chainId) => {
      if (data === rejectingItem) {
        return Promise.reject(new Error('WASM verify threw'));
      }
      return realImplementation(data, chainId);
    });

    const errors = await validateDepositData([okItem, rejectingItem], config);

    expect(
      errors.some(
        (e) =>
          e.index === 0 &&
          e.code === ValidationErrorCode.BLS_VERIFICATION_UNAVAILABLE,
      ),
    ).toBe(false);
    expect(
      errors.some(
        (e) =>
          e.index === 1 &&
          e.code === ValidationErrorCode.BLS_VERIFICATION_UNAVAILABLE,
      ),
    ).toBe(true);

    spy.mockImplementation(realImplementation);
  });
});
