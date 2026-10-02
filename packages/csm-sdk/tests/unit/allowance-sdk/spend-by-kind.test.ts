import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { TOKENS } from '../../../src/common/constants/tokens';
import { TransactionCallbackStage } from '../../../src/tx-sdk/types';
import {
  APPROVE_CALL,
  APPROVE_HASH,
  build,
  SIGNED_PERMIT,
  TX_HASH,
} from '../tx-sdk/wallet-fakes';

vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  getContract: vi.fn(),
}));

vi.mock('@lidofinance/lido-ethereum-sdk', async (orig) => ({
  ...(await orig<typeof import('@lidofinance/lido-ethereum-sdk')>()),
  getEncodableContract: (c: unknown) => c,
}));

const OTHER_SPENDER: Address = '0x9999999999999999999999999999999999999999';
const spend = { token: TOKENS.steth, amount: 5n } as const;
const S = TransactionCallbackStage;

describe('AllowanceSDK.approve / signPermitOrApprove by wallet kind', () => {
  it('approve on an atomicBatch wallet sends a single-call batch', async () => {
    const fakes = build('atomicBatch');
    const result = await fakes.allowanceSdk.approve({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.sendTransaction).not.toHaveBeenCalled();
    expect(fakes.sendCalls).toHaveBeenCalledWith(
      expect.objectContaining({ calls: [APPROVE_CALL] }),
    );
    expect(result.hash).toBe(TX_HASH);
  });

  it('approve on a multisig wallet uses the stubbed transaction path', async () => {
    const fakes = build('multisig');
    const result = await fakes.allowanceSdk.approve({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.sendCalls).not.toHaveBeenCalled();
    expect(fakes.sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ gas: 21_000n }),
    );
    expect(result).toEqual({ hash: APPROVE_HASH });
  });

  it('approve on an eoa waits for the receipt', async () => {
    const fakes = build('eoa');
    const result = await fakes.allowanceSdk.approve({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.waitForTransactionReceipt).toHaveBeenCalledTimes(1);
    expect(result.receipt).toBeDefined();
  });

  it('signPermitOrApprove returns a permit for eoa', async () => {
    const fakes = build('eoa', 0n);
    const result = await fakes.allowanceSdk.signPermitOrApprove({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(result.permit).toEqual(
      expect.objectContaining({ value: SIGNED_PERMIT.value }),
    );
    expect((result as { hash?: string }).hash).toBeUndefined();
    expect(fakes.sendTransaction).not.toHaveBeenCalled();
  });

  it('signPermitOrApprove returns an empty permit when allowance covers the spend', async () => {
    const fakes = build('eoa', 100n);
    const result = await fakes.allowanceSdk.signPermitOrApprove({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(result.permit).toEqual(expect.objectContaining({ value: 0n }));
    expect(fakes.signPermit).not.toHaveBeenCalled();
  });

  it('signPermitOrApprove approves via stub transaction on multisig', async () => {
    const fakes = build('multisig', 0n);
    const result = await fakes.allowanceSdk.signPermitOrApprove({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.signPermit).not.toHaveBeenCalled();
    expect(result.hash).toBe(APPROVE_HASH);
  });

  it('signPermitOrApprove approves via sendCalls on atomicBatch', async () => {
    const fakes = build('atomicBatch', 0n);
    const result = await fakes.allowanceSdk.signPermitOrApprove({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.sendTransaction).not.toHaveBeenCalled();
    expect(fakes.sendCalls).toHaveBeenCalledTimes(1);
    expect(result.hash).toBe(TX_HASH);
  });

  it('signPermitOrApprove notifies ERROR exactly once when the multisig approve fails', async () => {
    const fakes = build('multisig', 0n);
    fakes.sendTransaction.mockRejectedValueOnce(new Error('rpc down'));
    const callback = vi.fn();
    await expect(
      fakes.allowanceSdk.signPermitOrApprove({
        spend,
        spender: OTHER_SPENDER,
        callback,
      }),
    ).rejects.toThrow();
    const errors = callback.mock.calls.filter(([a]) => a.stage === S.ERROR);
    expect(errors).toHaveLength(1);
  });

  it('signs the permit for the explicit spender, not the module one', async () => {
    const fakes = build('eoa', 0n);
    await fakes.allowanceSdk.signPermitOrApprove({
      spend,
      spender: OTHER_SPENDER,
    });
    expect(fakes.signPermit).toHaveBeenCalledWith(
      expect.objectContaining({ spender: OTHER_SPENDER }),
    );
  });

  it('approve encodes the explicit spender', async () => {
    const fakes = build('eoa');
    await fakes.allowanceSdk.approve({ spend, spender: OTHER_SPENDER });
    expect(fakes.encodeApprove).toHaveBeenCalledWith([
      OTHER_SPENDER,
      expect.any(BigInt),
    ]);
  });

  it('approve notifies ERROR exactly once when the multisig send fails', async () => {
    const fakes = build('multisig');
    fakes.sendTransaction.mockRejectedValueOnce(new Error('rpc down'));
    const callback = vi.fn();
    await expect(
      fakes.allowanceSdk.approve({ spend, spender: OTHER_SPENDER, callback }),
    ).rejects.toThrow();
    const errors = callback.mock.calls.filter(([a]) => a.stage === S.ERROR);
    expect(errors).toHaveLength(1);
  });

  it('getApproveCallIfNeeded returns the call only when allowance is short', async () => {
    const short = build('eoa', 0n);
    expect(
      await short.allowanceSdk.getApproveCallIfNeeded({
        spend,
        spender: OTHER_SPENDER,
      }),
    ).toEqual(APPROVE_CALL);
    const enough = build('eoa', 100n);
    expect(
      await enough.allowanceSdk.getApproveCallIfNeeded({
        spend,
        spender: OTHER_SPENDER,
      }),
    ).toBeUndefined();
  });
});
