import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';

// `perform()` is the public surface that routes between AA (sendCalls) and
// EOA/multisig (sendTransaction). The decision is made on isAbstractAccount.

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

// Spying on `performCall` / `performTransaction` relies on TypeScript's
// `private` being erased at runtime to plain prototype properties. If the
// SDK ever migrates to ECMAScript hard-private fields (`#performCall`),
// or stage-3 decorators relocate these methods off the prototype, this
// setup throws at the vi.spyOn line and every test in this file fails.
// Keep them as prototype methods or extract them into a separately-importable
// helper so the spy has a stable target.
const buildTx = () => {
  const fakeCore = {
    core: { useAccount: async (a: unknown) => a ?? { address: ACCOUNT } },
  };
  const tx = new TxSDK({ core: fakeCore as never });
  const performCall = vi
    .spyOn(
      tx as unknown as { performCall: (p: unknown) => Promise<unknown> },
      'performCall',
    )
    .mockResolvedValue({ hash: '0xaa' } as never);
  const performTransaction = vi
    .spyOn(
      tx as unknown as {
        performTransaction: (p: unknown) => Promise<unknown>;
      },
      'performTransaction',
    )
    .mockResolvedValue({ hash: '0xeoa' } as never);
  const isAbstractAccount = vi.spyOn(tx, 'isAbstractAccount');
  return { tx, performCall, performTransaction, isAbstractAccount };
};

const fakeProps = {
  account: { address: ACCOUNT },
  call: () => ({ to: ACCOUNT, data: '0x' }),
} as never;

describe('TxSDK.perform (AA vs EOA/multisig routing)', () => {
  it('routes to performCall (sendCalls) when isAbstractAccount=true', async () => {
    const { tx, performCall, performTransaction, isAbstractAccount } =
      buildTx();
    isAbstractAccount.mockResolvedValue(true);

    await tx.perform(fakeProps);

    expect(performCall).toHaveBeenCalledTimes(1);
    expect(performTransaction).not.toHaveBeenCalled();
  });

  it('routes to performTransaction when isAbstractAccount=false (EOA)', async () => {
    const { tx, performCall, performTransaction, isAbstractAccount } =
      buildTx();
    isAbstractAccount.mockResolvedValue(false);

    await tx.perform(fakeProps);

    expect(performTransaction).toHaveBeenCalledTimes(1);
    expect(performCall).not.toHaveBeenCalled();
  });

  it('routes to performTransaction when isAbstractAccount=false (multisig — same branch as EOA)', async () => {
    // Multisig and EOA share the performTransaction path; the multisig
    // distinction happens *inside* internalTransaction (via isContract).
    const { tx, performCall, performTransaction, isAbstractAccount } =
      buildTx();
    isAbstractAccount.mockResolvedValue(false);

    await tx.perform(fakeProps);

    expect(performTransaction).toHaveBeenCalledTimes(1);
    expect(performCall).not.toHaveBeenCalled();
  });

  it('checks AA capability against the resolved account address', async () => {
    const { tx, isAbstractAccount } = buildTx();
    isAbstractAccount.mockResolvedValue(false);

    await tx.perform(fakeProps);

    expect(isAbstractAccount).toHaveBeenCalledWith(ACCOUNT);
  });

  it('forwards the original props to the branch implementation', async () => {
    const { tx, performTransaction, isAbstractAccount } = buildTx();
    isAbstractAccount.mockResolvedValue(false);

    const callback = vi.fn();
    const decodeResult = vi.fn();
    const props = {
      account: { address: ACCOUNT },
      call: () => ({ to: ACCOUNT, data: '0x' }),
      callback,
      decodeResult,
    } as never;

    await tx.perform(props);

    expect(performTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ callback, decodeResult }),
    );
  });
});
