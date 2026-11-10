import { ExecutionRevertedError } from 'viem';
import { describe, expect, it, vi } from 'vitest';
import { BondSDK } from '../../../src/bond-sdk/bond-sdk';
import { ERROR_CODE, SDKError } from '../../../src/common/index';
import { TOKENS } from '../../../src/common/constants/tokens';
import { PERMIT_GAS_OVERHEAD } from '../../../src/tx-sdk/consts';
import {
  ACCOUNT,
  APPROVE_CALL,
  APPROVE_GAS,
  build,
  GIVEN_PERMIT,
  Kind,
  MAIN_CALL,
  MAIN_GAS,
  STETH,
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

const estimate = (
  fakes: ReturnType<typeof build>,
  extra: Record<string, unknown> = {},
) => {
  const callback = vi.fn();
  const call = vi.fn((_props: unknown) => MAIN_CALL);
  const promise = fakes.tx.estimate({ callback, call, ...extra } as never);
  return { promise, call, callback };
};

const expectNothingSent = (fakes: ReturnType<typeof build>) => {
  expect(fakes.sendTransaction).not.toHaveBeenCalled();
  expect(fakes.sendCalls).not.toHaveBeenCalled();
  expect(fakes.signPermit).not.toHaveBeenCalled();
};

const estimateArgs = (fakes: ReturnType<typeof build>, index: number) =>
  fakes.estimateGas.mock.calls[index]?.[0] as Record<string, any>;

const KINDS: Kind[] = ['eoa', 'multisig', 'multisigBatch', 'atomicBatch'];

describe('TxSDK.estimate', () => {
  describe.each(KINDS)('%s', (kind) => {
    it('estimates the main call only when there is no spend', async () => {
      const fakes = build(kind);
      const result = await estimate(fakes).promise;
      expect(result).toEqual({
        main: MAIN_GAS,
        unlock: undefined,
        total: MAIN_GAS,
        walletKind: kind,
      });
      expect(fakes.estimateGas).toHaveBeenCalledTimes(1);
      expect(fakes.estimateGas).toHaveBeenCalledWith(
        expect.objectContaining({
          account: ACCOUNT,
          to: MAIN_CALL.to,
          stateOverride: undefined,
        }),
      );
      expectNothingSent(fakes);
    });

    it('has no unlock and no override when allowance covers the spend', async () => {
      const fakes = build(kind, 100n);
      const result = await estimate(fakes, { spend }).promise;
      expect(result.unlock).toBeUndefined();
      expect(result.total).toBe(MAIN_GAS);
      expect(fakes.estimateGas).toHaveBeenCalledTimes(1);
      expect(estimateArgs(fakes, 0)).toMatchObject({
        stateOverride: undefined,
      });
      expectNothingSent(fakes);
    });
  });

  describe.each(['eoa', 'multisig', 'multisigBatch'] as const)(
    '%s with a caller permit',
    (kind) => {
      it('estimates with the real permit, exact, no override and no unlock', async () => {
        const fakes = build(kind, 0n);
        const { promise, call } = estimate(fakes, {
          spend: { ...spend, permit: GIVEN_PERMIT },
        });
        const result = await promise;
        expect(result.unlock).toBeUndefined();
        expect(result.total).toBe(MAIN_GAS);
        expect(call).toHaveBeenCalledWith(
          expect.objectContaining({
            permit: expect.objectContaining({ value: GIVEN_PERMIT.value }),
          }),
        );
        expect(fakes.estimateGas).toHaveBeenCalledTimes(1);
        expect(estimateArgs(fakes, 0)).toMatchObject({
          stateOverride: undefined,
        });
        expectNothingSent(fakes);
      });
    },
  );

  describe('eoa needing approval', () => {
    it('overrides allowance and reports the permit constant as unlock', async () => {
      const fakes = build('eoa', 0n);
      const result = await estimate(fakes, { spend }).promise;
      const gas = PERMIT_GAS_OVERHEAD[TOKENS.steth];
      expect(result).toEqual({
        main: MAIN_GAS,
        unlock: { kind: 'permit', gas },
        total: MAIN_GAS + gas,
        walletKind: 'eoa',
      });
      expect(fakes.estimateGas).toHaveBeenCalledTimes(1);
      const [override] = estimateArgs(fakes, 0)?.stateOverride ?? [];
      expect(estimateArgs(fakes, 0)?.stateOverride).toHaveLength(1);
      expect(override.address).toBe(STETH);
      // stETH spend amount carries the 10 wei rounding threshold
      expect(BigInt(override.stateDiff[0].value)).toBe(15n);
      expectNothingSent(fakes);
    });
  });

  describe.each(['multisig', 'multisigBatch', 'atomicBatch'] as const)(
    '%s needing approval',
    (kind) => {
      it('estimates the approve call as unlock', async () => {
        const fakes = build(kind, 0n);
        const result = await estimate(fakes, { spend }).promise;
        expect(result).toEqual({
          main: MAIN_GAS,
          unlock: { kind: 'approve', gas: APPROVE_GAS },
          total: MAIN_GAS + APPROVE_GAS,
          walletKind: kind,
        });
        expect(fakes.estimateGas).toHaveBeenCalledTimes(2);
        const sent = [estimateArgs(fakes, 0), estimateArgs(fakes, 1)];
        expect(sent.find((a) => a.to === MAIN_CALL.to)).toMatchObject({
          stateOverride: expect.any(Array),
        });
        expect(sent.find((a) => a.to === APPROVE_CALL.to)).toMatchObject({
          stateOverride: undefined,
        });
        expect(fakes.encodeApprove).toHaveBeenCalledWith([
          expect.any(String),
          15n,
        ]);
        expectNothingSent(fakes);
      });
    },
  );

  it('estimates main and approve in parallel for non-eoa kinds', async () => {
    const fakes = build('multisig', 0n);
    const started: (string | undefined)[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    fakes.estimateGas.mockImplementation(async (args: { to?: string }) => {
      started.push(args.to);
      await gate;
      return args.to === STETH ? APPROVE_GAS : MAIN_GAS;
    });
    const promise = estimate(fakes, { spend }).promise;
    await vi.waitFor(() => expect(started).toHaveLength(2));
    release();
    await expect(promise).resolves.toMatchObject({
      total: MAIN_GAS + APPROVE_GAS,
    });
  });

  it('atomicBatch ignores a caller permit like perform does', async () => {
    const fakes = build('atomicBatch', 0n);
    const result = await estimate(fakes, {
      spend: { ...spend, permit: GIVEN_PERMIT },
    }).promise;
    expect(result.unlock?.kind).toBe('approve');
    expect(fakes.estimateGas).toHaveBeenCalledTimes(2);
    expectNothingSent(fakes);
  });

  describe('failures', () => {
    it('rejects SDKError and never calls the callback when estimation reverts', async () => {
      const fakes = build('eoa');
      fakes.estimateGas.mockRejectedValueOnce(new Error('execution reverted'));
      const { promise, callback } = estimate(fakes);
      await expect(promise).rejects.toBeInstanceOf(SDKError);
      expect(callback).not.toHaveBeenCalled();
    });

    it('maps an allowance revert to NOT_SUPPORTED when the override was ignored', async () => {
      const fakes = build('eoa', 0n, { overrideIgnored: true });
      const cause = new Error('execution reverted: ALLOWANCE_EXCEEDED');
      fakes.estimateGas.mockRejectedValueOnce(cause);
      const { promise, callback } = estimate(fakes, { spend });
      await expect(promise).rejects.toMatchObject({
        code: ERROR_CODE.NOT_SUPPORTED,
        message: expect.stringContaining('stateOverride not applied'),
        cause,
      });
      expect(fakes.readAllowance).toHaveBeenCalledWith(
        [ACCOUNT, expect.any(String)],
        { stateOverride: expect.any(Array) },
      );
      expect(callback).not.toHaveBeenCalled();
    });

    it('keeps NOT_SUPPORTED over a classified viem revert cause', async () => {
      const fakes = build('eoa', 0n, { overrideIgnored: true });
      fakes.estimateGas.mockRejectedValueOnce(
        new ExecutionRevertedError({
          message: 'execution reverted: ALLOWANCE_EXCEEDED',
        }),
      );
      await expect(estimate(fakes, { spend }).promise).rejects.toMatchObject({
        code: ERROR_CODE.NOT_SUPPORTED,
      });
    });

    it('rethrows the original revert when the override was applied', async () => {
      const fakes = build('eoa', 0n);
      const cause = new Error('execution reverted: ALLOWANCE_EXCEEDED');
      fakes.estimateGas.mockRejectedValueOnce(cause);
      const error = await estimate(fakes, { spend }).promise.catch((e) => e);
      expect(error).toBeInstanceOf(SDKError);
      expect(error.code).not.toBe(ERROR_CODE.NOT_SUPPORTED);
      expect(error.cause).toBe(cause);
      expect(fakes.estimateGas).toHaveBeenCalledTimes(1);
    });

    it('keeps other reverts on the override path unchanged', async () => {
      const fakes = build('eoa', 0n);
      fakes.estimateGas.mockRejectedValueOnce(new Error('something else'));
      await expect(
        estimate(fakes, { spend }).promise,
      ).rejects.not.toMatchObject({ code: ERROR_CODE.NOT_SUPPORTED });
    });

    it('throws INVALID_ARGUMENT without prompting when no account is known', async () => {
      const fakes = build('eoa', 0n, { walletAccount: false });
      await expect(estimate(fakes).promise).rejects.toMatchObject({
        code: ERROR_CODE.INVALID_ARGUMENT,
      });
      expect(fakes.requestAddresses).not.toHaveBeenCalled();
      expect(fakes.estimateGas).not.toHaveBeenCalled();
    });

    it('uses an explicit account without a wallet account', async () => {
      const fakes = build('eoa', 0n, { walletAccount: false });
      const result = await estimate(fakes, { account: ACCOUNT }).promise;
      expect(result.main).toBe(MAIN_GAS);
      expect(fakes.requestAddresses).not.toHaveBeenCalled();
    });
  });

  describe('module sibling', () => {
    it('never invokes the callback when the estimate reverts', async () => {
      const fakes = build('eoa');
      fakes.estimateGas.mockRejectedValueOnce(new Error('execution reverted'));
      const core = {
        getContract: () => ({
          encode: { depositETH: () => MAIN_CALL },
          read: {},
        }),
      };
      const bond = new BondSDK({
        core: core as never,
        bus: fakes.bus as never,
      });
      (fakes.bus as any).register(fakes.tx, 'tx');
      const callback = vi.fn();
      await expect(
        bond.estimateAddBond({
          token: TOKENS.eth,
          nodeOperatorId: 1n,
          amount: 1n,
          callback,
        } as never),
      ).rejects.toBeInstanceOf(SDKError);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
