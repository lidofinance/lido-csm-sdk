import { describe, expect, it, vi } from 'vitest';
import type { Address } from 'viem';
import { TxSDK } from '../../../src/tx-sdk/tx-sdk';

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CHAIN_ID = 560_048;

// --- isAbstractAccount ---

const buildAaTx = (capabilities: unknown, throws = false) => {
  const getCapabilities = vi.fn(async () => {
    if (throws) throw new Error('rpc rejected');
    return capabilities;
  });
  const fakeCore = {
    chainId: CHAIN_ID,
    walletClient: { getCapabilities },
  };
  return {
    tx: new TxSDK({ core: fakeCore as never }),
    getCapabilities,
  };
};

describe('TxSDK.isAbstractAccount', () => {
  it('returns true when chain-specific atomic capability is supported (status form)', async () => {
    const { tx } = buildAaTx({
      [CHAIN_ID]: { atomic: { status: 'supported' } },
    });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(true);
  });

  it('returns true when the wallet returns atomic under chain id 0 (EIP-5792 wildcard)', async () => {
    const { tx } = buildAaTx({ 0: { atomic: { status: 'supported' } } });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(true);
  });

  // Pins the documented `caps[0] || caps[chainId]` precedence in
  // is-capability-supported.ts: the chain-0 wildcard ALWAYS wins when
  // declared, even if the per-chain entry contradicts. EIP-5792 doesn't
  // mandate conflict resolution, so this case lives here so a future change
  // to the precedence rule cannot pass tests silently.
  it('chain-0 wildcard wins over a contradicting per-chain declaration', async () => {
    const { tx } = buildAaTx({
      0: { atomic: { status: 'supported' } },
      [CHAIN_ID]: { atomic: { status: 'unsupported' } },
    });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(true);
  });

  it('returns true when the legacy { supported: true } shape is used', async () => {
    const { tx } = buildAaTx({ [CHAIN_ID]: { atomic: { supported: true } } });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(true);
  });

  it('returns false when atomic status is "unsupported"', async () => {
    const { tx } = buildAaTx({
      [CHAIN_ID]: { atomic: { status: 'unsupported' } },
    });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(false);
  });

  it('returns false when atomic is "ready" (declared but not active)', async () => {
    const { tx } = buildAaTx({ [CHAIN_ID]: { atomic: { status: 'ready' } } });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(false);
  });

  it('returns false when no capabilities are returned for the chain', async () => {
    const { tx } = buildAaTx({ 999: { atomic: { supported: true } } });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(false);
  });

  it('returns false when the wallet does not implement getCapabilities', async () => {
    const { tx } = buildAaTx(undefined, true);
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(false);
  });

  it('forwards the account to getCapabilities', async () => {
    const { tx, getCapabilities } = buildAaTx({
      [CHAIN_ID]: { atomic: { status: 'supported' } },
    });
    await tx.isAbstractAccount(ACCOUNT);
    expect(getCapabilities).toHaveBeenCalledWith({ account: ACCOUNT });
  });
});

// --- isMultisig ---

const buildMultisigTx = (isContractResult: boolean) => {
  const isContract = vi.fn(async () => isContractResult);
  const useAccount = vi.fn(async (a: unknown) => a ?? { address: ACCOUNT });
  const fakeCore = {
    core: { isContract, useAccount },
  };
  return {
    tx: new TxSDK({ core: fakeCore as never }),
    isContract,
    useAccount,
  };
};

describe('TxSDK.isMultisig', () => {
  it('returns true when the resolved account address has bytecode', async () => {
    const { tx } = buildMultisigTx(true);
    expect(await tx.isMultisig()).toBe(true);
  });

  it('returns false when the resolved account is a plain EOA', async () => {
    const { tx } = buildMultisigTx(false);
    expect(await tx.isMultisig()).toBe(false);
  });

  it('passes the explicit account through useAccount before checking code', async () => {
    const { tx, useAccount, isContract } = buildMultisigTx(true);
    const explicit = { address: ACCOUNT } as never;
    await tx.isMultisig(explicit);
    expect(useAccount).toHaveBeenCalledWith(explicit);
    expect(isContract).toHaveBeenCalledWith(ACCOUNT);
  });
});
