import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { validateDepositData } from '../../../src/deposit-data-sdk/validator';
import {
  DepositData,
  ValidationErrorCode,
  ValidationProps,
} from '../../../src/deposit-data-sdk/types';

// Valid hex format everywhere, but the signature is not a real BLS signature,
// so BLS verification fails while the cheap hex-format check passes.
const BAD_SIGNATURE_ITEM: DepositData = {
  pubkey: `0x${'ab'.repeat(48)}`,
  withdrawal_credentials: `0x${'ef'.repeat(32)}`,
  amount: 32_000_000_000,
  signature: `0x${'cd'.repeat(96)}`,
  deposit_message_root: `0x${'12'.repeat(32)}`,
  deposit_data_root: `0x${'34'.repeat(32)}`,
  fork_version: '0x00000000',
  network_name: 'mainnet',
  deposit_cli_version: '2.3.0',
};

const config: ValidationProps = {
  chainId: CHAINS.Mainnet,
  withdrawalCredentials: `0x${'ef'.repeat(32)}`,
  wcPrefix: '01',
};

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
