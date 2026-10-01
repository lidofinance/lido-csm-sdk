import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { BusRegistry } from '../../../src/common/class-primitives/bus-registry';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';

// `perform()` is the public surface that routes between AA (sendCalls) and
// EOA/multisig (sendTransaction). The decision is made on isAbstractAccount.

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const buildBus = (mocks: { wallet?: object; allowance?: object } = {}) => {
  const bus = new BusRegistry<{ wallet: object; allowance: object }>();
  bus.register(mocks.wallet ?? {}, 'wallet');
  bus.register(mocks.allowance ?? {}, 'allowance');
  return bus as never;
};

// Spies need `performCall`/`performTransaction` on the prototype (TS `private`
// erases to plain methods); hard-private `#fields` would break this setup.
const buildTx = () => {
  const fakeCore = {
    core: { useAccount: async (a: unknown) => a ?? { address: ACCOUNT } },
  };
  const tx = new TxSDK({ core: fakeCore as never, bus: buildBus() });
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

describe('TxSDK pass-throughs fill in the module spender', () => {
  const SPENDER = '0xcccccccccccccccccccccccccccccccccccccccc';
  const build = () => {
    const allowances = {
      allowance: vi.fn(async () => 1n),
      checkAllowance: vi.fn(async () => ({
        allowance: 1n,
        needsApprove: false,
      })),
      signPermit: vi.fn(async () => ({})),
      approve: vi.fn(async () => ({ hash: '0x1' })),
      signPermitOrApprove: vi.fn(async () => ({ permit: {} })),
    };
    const fakeCore = {
      getContractAddress: () => SPENDER,
    };
    const tx = new TxSDK({
      core: fakeCore as never,
      bus: buildBus({ allowance: allowances }),
    });
    return { tx, allowances };
  };
  const spend = { token: 'steth', amount: 1n } as never;

  it.each([
    ['allowance', { token: 'steth' }],
    ['checkAllowance', { spend }],
    ['signPermit', { spend }],
    ['approve', { spend }],
    ['signPermitOrApprove', { spend }],
  ] as const)('%s', async (method, props) => {
    const { tx, allowances } = build();
    await (tx as any)[method](props);
    expect(allowances[method]).toHaveBeenCalledWith(
      expect.objectContaining({ spender: SPENDER }),
    );
  });
});
