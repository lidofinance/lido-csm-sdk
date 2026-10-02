import { describe, expect, it, vi } from 'vitest';
import { TOKENS } from '../../../src/common/constants/tokens';
import { TransactionCallbackStage } from '../../../src/tx-sdk/types';
import {
  APPROVE_CALL,
  APPROVE_HASH,
  build,
  GIVEN_PERMIT,
  MAIN_CALL,
  SIGNED_PERMIT,
  SPENDER,
  TX_HASH,
} from './wallet-fakes';

vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  getContract: vi.fn(),
}));

vi.mock('@lidofinance/lido-ethereum-sdk', async (orig) => ({
  ...(await orig<typeof import('@lidofinance/lido-ethereum-sdk')>()),
  getEncodableContract: (c: unknown) => c,
}));

const spend = { token: TOKENS.steth, amount: 5n } as const;

const run = (
  fakes: ReturnType<typeof build>,
  extra: Record<string, unknown> = {},
) => {
  const stages: TransactionCallbackStage[] = [];
  const callback = vi.fn((args: { stage: TransactionCallbackStage }) => {
    stages.push(args.stage);
  });
  const call = vi.fn((_props: unknown) => MAIN_CALL);
  const promise = fakes.tx.perform({
    callback,
    call,
    ...extra,
  } as never);
  return { promise, stages, call, callback };
};

const S = TransactionCallbackStage;

describe('TxSDK.perform routing by wallet kind', () => {
  describe('eoa', () => {
    it('sends one transaction through the full stage sequence, no spend', async () => {
      const fakes = build('eoa');
      const { promise, stages } = run(fakes);
      const result = await promise;
      expect(fakes.sendTransaction).toHaveBeenCalledTimes(1);
      expect(fakes.sendCalls).not.toHaveBeenCalled();
      expect(stages).toEqual([
        S.GAS_LIMIT,
        S.SIGN,
        S.RECEIPT,
        S.CONFIRMATION,
        S.DONE,
      ]);
      expect(result.hash).toBe(APPROVE_HASH);
      expect(result.receipt).toBeDefined();
    });

    it('signs a permit when allowance is short and feeds it to the call', async () => {
      const fakes = build('eoa', 0n);
      const { promise, stages, call } = run(fakes, { spend });
      await promise;
      expect(fakes.signPermit).toHaveBeenCalledTimes(1);
      expect(fakes.sendTransaction).toHaveBeenCalledTimes(1);
      expect(stages[0]).toBe(S.PERMIT_SIGN);
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          permit: expect.objectContaining({ value: SIGNED_PERMIT.value }),
        }),
      );
    });

    it('skips signing when allowance covers the spend', async () => {
      const fakes = build('eoa', 100n);
      const { promise, call } = run(fakes, { spend });
      await promise;
      expect(fakes.signPermit).not.toHaveBeenCalled();
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          permit: expect.objectContaining({ value: 0n }),
        }),
      );
    });

    it('uses a caller-supplied permit without signing', async () => {
      const fakes = build('eoa', 0n);
      const { promise, call } = run(fakes, {
        spend: { ...spend, permit: GIVEN_PERMIT },
      });
      await promise;
      expect(fakes.signPermit).not.toHaveBeenCalled();
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          permit: expect.objectContaining({ v: 28, value: 7n }),
        }),
      );
    });
  });

  describe('multisig', () => {
    it('sends with stub overrides, fires MULTISIG_DONE and returns the hash only', async () => {
      const fakes = build('multisig');
      const { promise, stages } = run(fakes);
      const result = await promise;
      expect(result).toEqual({ hash: APPROVE_HASH });
      expect(stages).toEqual([S.SIGN, S.MULTISIG_DONE]);
      expect(fakes.estimateGas).not.toHaveBeenCalled();
      expect(fakes.sendTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          gas: 21_000n,
          maxFeePerGas: 1n,
          maxPriorityFeePerGas: 1n,
          nonce: 1,
        }),
      );
    });

    it('approves and stops when allowance is short, deferring the main call', async () => {
      const fakes = build('multisig', 0n);
      const { promise, stages, call } = run(fakes, { spend });
      const result = await promise;
      expect(result).toEqual({ hash: APPROVE_HASH });
      expect(fakes.signPermit).not.toHaveBeenCalled();
      expect(fakes.sendTransaction).toHaveBeenCalledTimes(1);
      expect(call).not.toHaveBeenCalled();
      expect(stages).toEqual([S.APPROVE_SIGN, S.MULTISIG_DONE]);
    });

    it('sends the main call when allowance already covers the spend', async () => {
      const fakes = build('multisig', 100n);
      const { promise, call } = run(fakes, { spend });
      await promise;
      expect(call).toHaveBeenCalledTimes(1);
      expect(fakes.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it('notifies ERROR once when the approve fails', async () => {
      const fakes = build('multisig', 0n);
      fakes.sendTransaction.mockRejectedValueOnce(new Error('rpc down'));
      const { promise, stages } = run(fakes, { spend });
      await expect(promise).rejects.toThrow();
      expect(stages.filter((s) => s === S.ERROR)).toHaveLength(1);
    });
  });

  describe('atomicBatch', () => {
    it('batches approve + call through sendCalls', async () => {
      const fakes = build('atomicBatch', 0n);
      const { promise, stages } = run(fakes, { spend });
      const result = await promise;
      expect(fakes.sendTransaction).not.toHaveBeenCalled();
      expect(fakes.signPermit).not.toHaveBeenCalled();
      expect(fakes.sendCalls).toHaveBeenCalledTimes(1);
      expect(fakes.sendCalls).toHaveBeenCalledWith(
        expect.objectContaining({
          calls: [APPROVE_CALL, MAIN_CALL],
          experimental_fallback: true,
        }),
      );
      expect(stages).toEqual([S.SIGN, S.RECEIPT, S.DONE]);
      expect(result.hash).toBe(TX_HASH);
    });

    it('omits the approve when allowance covers the spend', async () => {
      const fakes = build('atomicBatch', 100n);
      await run(fakes, { spend }).promise;
      expect(fakes.sendCalls).toHaveBeenCalledWith(
        expect.objectContaining({ calls: [MAIN_CALL] }),
      );
    });

    it('ignores a caller-supplied permit', async () => {
      const fakes = build('atomicBatch', 0n);
      const { promise, call } = run(fakes, {
        spend: { ...spend, permit: GIVEN_PERMIT },
      });
      await promise;
      expect(fakes.signPermit).not.toHaveBeenCalled();
      expect(fakes.sendCalls).toHaveBeenCalledWith(
        expect.objectContaining({ calls: [APPROVE_CALL, MAIN_CALL] }),
      );
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({
          permit: expect.objectContaining({ value: 0n }),
        }),
      );
    });
  });
});

describe('TxSDK delegation', () => {
  it('resolves wallet kind exactly once per perform', async () => {
    for (const kind of ['eoa', 'multisig', 'atomicBatch'] as const) {
      const fakes = build(kind, 0n);
      await run(fakes, { spend }).promise;
      expect(fakes.getWalletKind).toHaveBeenCalledTimes(1);
    }
  });

  it('approve and signPermitOrApprove fill in the module spender', async () => {
    const fakes = build('eoa', 0n);
    await fakes.tx.approve({ spend });
    await fakes.tx.signPermitOrApprove({ spend });
    expect(fakes.encodeApprove).toHaveBeenCalledWith([
      SPENDER,
      expect.any(BigInt),
    ]);
    expect(fakes.signPermit).toHaveBeenCalledWith(
      expect.objectContaining({ spender: SPENDER }),
    );
    expect(fakes.getWalletKind).toHaveBeenCalledTimes(2);
  });

  it.each(['approve', 'signPermitOrApprove'] as const)(
    '%s notifies ERROR exactly once when the multisig approve fails',
    async (method) => {
      const fakes = build('multisig', 0n);
      fakes.sendTransaction.mockRejectedValueOnce(new Error('rpc down'));
      const callback = vi.fn();
      await expect(fakes.tx[method]({ spend, callback })).rejects.toThrow();
      const errors = callback.mock.calls.filter(([a]) => a.stage === S.ERROR);
      expect(errors).toHaveLength(1);
    },
  );

  it('allowance reads and permit signing fill in the module spender', async () => {
    const fakes = build('eoa', 0n);
    await fakes.tx.signPermit({ spend });
    expect(fakes.signPermit).toHaveBeenCalledWith(
      expect.objectContaining({ spender: SPENDER }),
    );
  });
});
