import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import { ERROR_CODE, SDKError } from '../../src';
import {
  useAccount,
  useCsmSdk,
  useCsmSdkWithWallet,
  useTestClient,
} from '../helpers';

// End-to-end proof that a *real* on-chain contract revert surfaces as a
// properly classified + decoded SDKError — not a synthetic mock. On the EOA
// branch of TxSDK.perform the revert is caught PRE-BROADCAST by estimateGas;
// the classifier overrides the TRANSACTION_ERROR context hint with
// CONTRACT_REVERT because the revert selector decodes against the SDK ABIs.
// Case #1 covers the empty-args decode (NodeOperatorDoesNotExist); case #2
// covers the typed 2-tuple decode (AccessControlUnauthorizedAccount).

// bytes32 penaltyType — full 32-byte zero so ABI encoding succeeds and the
// OZ onlyRole guard is what reverts (not an arg-shape error).
const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

describe('integration: error-revert-wallet (EOA, real on-chain revert)', () => {
  let snapshotId: `0x${string}`;

  // Snapshot/revert keeps account nonce + balance from leaking into any other
  // integration test that shares the singleFork anvil instance.
  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('addBondETH on a non-existent operator reverts with decoded NodeOperatorDoesNotExist (no args)', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();
    const readSdk = useCsmSdk();

    // Generous balance so a revert is the contract guard, never gas funds.
    await test.setBalance({
      address: account.address,
      value: parseEther('1000'),
    });

    const count = await readSdk.module.getOperatorsCount();
    const missingId = count + 1000n; // guaranteed missing on any fork state

    const err = await sdk.bond
      .addBondETH({ nodeOperatorId: missingId, amount: parseEther('1') })
      .then(
        () => {
          throw new Error('expected revert');
        },
        (e) => e,
      );

    expect(err).toBeInstanceOf(SDKError);
    const sdkErr = err as SDKError;
    expect(sdkErr.code).toBe(ERROR_CODE.CONTRACT_REVERT);
    expect(sdkErr.decodedRevert?.name).toBe('NodeOperatorDoesNotExist');
    expect(sdkErr.decodedRevert?.args).toEqual([]);
    expect(sdkErr.cause).toBeDefined();
  }, 60_000);

  it('reporting a delayed penalty from a non-role account reverts with decoded AccessControlUnauthorizedAccount (typed 2-tuple args)', async () => {
    const test = useTestClient();
    const account = useAccount();
    const sdk = useCsmSdkWithWallet();

    await test.setBalance({
      address: account.address,
      value: parseEther('1000'),
    });

    // The dev account does NOT hold REPORT_GENERAL_DELAYED_PENALTY_ROLE, so
    // the OZ onlyRole modifier reverts before any arg validation.
    const err = await sdk.delayedPenalty
      .report({
        nodeOperatorId: 0n,
        penaltyType: ZERO_BYTES32,
        amount: 1n,
        details: '',
      })
      .then(
        () => {
          throw new Error('expected revert');
        },
        (e) => e,
      );

    expect(err).toBeInstanceOf(SDKError);
    const sdkErr = err as SDKError;
    expect(sdkErr.code).toBe(ERROR_CODE.CONTRACT_REVERT);
    expect(sdkErr.decodedRevert?.name).toBe('AccessControlUnauthorizedAccount');
    expect(Array.isArray(sdkErr.decodedRevert?.args)).toBe(true);
    const args = sdkErr.decodedRevert?.args as readonly unknown[];
    expect(args.length).toBe(2);
    // First arg = the unauthorized account.
    expect(String(args[0]).toLowerCase()).toBe(account.address.toLowerCase());
  }, 60_000);
});
