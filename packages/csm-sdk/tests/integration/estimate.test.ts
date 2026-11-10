import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseEther } from 'viem';
import { ERROR_CODE, SDKError, TOKENS } from '../../src';
import {
  makeCsmSdk,
  useAltAccount,
  usePublicClient,
  useTestClient,
} from '../helpers';

const OPERATOR_ID = 0n;
const PREVIEW_SEED = 0xe5_71_a7n;

describe('integration: estimate (disconnected preview)', () => {
  let snapshotId: `0x${string}`;

  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it('estimateAddBond ETH resolves for an explicit account without a wallet', async () => {
    const sdk = makeCsmSdk(usePublicClient());
    const { address } = useAltAccount(PREVIEW_SEED);
    await useTestClient().setBalance({
      address,
      value: parseEther('100'),
    });

    const estimate = await sdk.bond.estimateAddBond({
      token: TOKENS.eth,
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      account: address,
    });

    expect(estimate.main).toBeGreaterThan(0n);
    expect(estimate.unlock).toBeUndefined();
    expect(estimate.total).toBe(estimate.main);
  });

  it('MANAGER-only method from a non-manager rejects with a decoded revert', async () => {
    const sdk = makeCsmSdk(usePublicClient());
    const { address } = useAltAccount(PREVIEW_SEED);

    const err = await sdk.bond
      .estimateCompensateLockedBond({
        nodeOperatorId: OPERATOR_ID,
        account: address,
      })
      .then(
        () => {
          throw new Error('expected revert');
        },
        (e) => e,
      );

    expect(err).toBeInstanceOf(SDKError);
    expect(err.decodedRevert).toBeDefined();
  });

  it('rejects with INVALID_ARGUMENT when no account is available', async () => {
    const sdk = makeCsmSdk(usePublicClient());

    const err = await sdk.bond
      .estimateAddBond({
        token: TOKENS.eth,
        nodeOperatorId: OPERATOR_ID,
        amount: parseEther('1'),
      })
      .then(
        () => {
          throw new Error('expected rejection');
        },
        (e) => e,
      );

    expect(err).toBeInstanceOf(SDKError);
    expect(err.code).toBe(ERROR_CODE.INVALID_ARGUMENT);
  });
});
