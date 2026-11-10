import { describe, expect, it, vi } from 'vitest';
import { getAddress, type Address } from 'viem';
import { ERROR_CODE } from '../../../src/common/index';
import { WalletSDK } from '../../../src/wallet-sdk/wallet-sdk';
import {
  revertError,
  transportError,
  zeroDataError,
} from './contract-call-errors';

const ACCOUNT: Address = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const CHAIN_ID = 560_048;

// --- isAbstractAccount ---

const buildAaTx = (capabilities: unknown, throws = false) => {
  const getCapabilities = vi.fn(async () => {
    if (throws) throw new Error('rpc rejected');
    return capabilities;
  });
  const fakeCore = {
    chain: { id: CHAIN_ID },
    useWalletClient: () => ({ getCapabilities }),
  };
  return {
    tx: new WalletSDK({ core: fakeCore as never }),
    getCapabilities,
  };
};

describe('WalletSDK.isAbstractAccount', () => {
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
    expect(getCapabilities).toHaveBeenCalledWith({
      account: getAddress(ACCOUNT),
    });
  });

  it('returns false for the legacy atomicBatch key alone', async () => {
    const { tx } = buildAaTx({
      [CHAIN_ID]: { atomicBatch: { supported: true } },
    });
    expect(await tx.isAbstractAccount(ACCOUNT)).toBe(false);
  });

  it('returns false without an RPC for an invalid address', async () => {
    const { tx, getCapabilities } = buildAaTx({
      [CHAIN_ID]: { atomic: { status: 'supported' } },
    });
    expect(await tx.isAbstractAccount('0xnot-an-address' as Address)).toBe(
      false,
    );
    expect(getCapabilities).not.toHaveBeenCalled();
  });
});

// --- isMultisig ---

const buildMultisigTx = (isContractResult: boolean) => {
  const isContract = vi.fn(async () => isContractResult);
  const useAccount = vi.fn(async (a: unknown) => a ?? { address: ACCOUNT });
  const fakeCore = { isContract, useAccount };
  return {
    tx: new WalletSDK({ core: fakeCore as never }),
    isContract,
    useAccount,
  };
};

describe('WalletSDK.isMultisig', () => {
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
    expect(isContract).toHaveBeenCalledWith(getAddress(ACCOUNT));
  });
});

// --- getWalletKind ---

const ATOMIC = { atomic: { status: 'supported' } };
const LEGACY = { atomicBatch: { supported: true } };

type KindOpts = {
  code: boolean;
  caps?: Record<string, unknown>;
  capsThrow?: boolean;
  threshold?: bigint | Error;
};

const buildKind = (opts: KindOpts) => {
  const getCapabilities = vi.fn(async (_args: unknown) => {
    if (opts.capsThrow) throw new Error('method not found');
    return { [CHAIN_ID]: opts.caps ?? {} };
  });
  const isContract = vi.fn(async (_address: Address) => opts.code);
  const readContract = vi.fn(async (_args: unknown) => {
    if (opts.threshold instanceof Error) throw opts.threshold;
    return opts.threshold ?? 1n;
  });
  const fakeCore = {
    chain: { id: CHAIN_ID },
    useAccount: async (a: unknown) =>
      typeof a === 'string' ? { address: a } : (a ?? { address: ACCOUNT }),
    useWalletClient: () => ({ getCapabilities }),
    publicClient: { readContract },
    isContract,
  };
  return {
    wallet: new WalletSDK({ core: fakeCore as never }),
    getCapabilities,
    isContract,
    readContract,
  };
};

describe('WalletSDK.getWalletKind', () => {
  it.each<[string, KindOpts, string]>([
    ['EOA', { code: false }, 'eoa'],
    [
      '7702 EOA with atomic supported',
      { code: false, caps: ATOMIC },
      'atomicBatch',
    ],
    [
      '7702 EOA with atomic ready',
      { code: false, caps: { atomic: { status: 'ready' } } },
      'eoa',
    ],
    [
      'EOA-shaped account with the legacy key only',
      { code: false, caps: LEGACY },
      'eoa',
    ],
    ['contract without caps', { code: true }, 'multisig'],
    [
      'Safe whose provider lacks EIP-5792',
      { code: true, capsThrow: true },
      'multisig',
    ],
  ])('%s, without a Safe probe', async (_label, opts, kind) => {
    const { wallet, readContract } = buildKind(opts);
    expect(await wallet.getWalletKind()).toBe(kind);
    expect(readContract).not.toHaveBeenCalled();
  });

  it.each<[string, KindOpts, string]>([
    [
      'Safe over the iframe (legacy key only)',
      { code: true, caps: LEGACY, threshold: 1n },
      'multisigBatch',
    ],
    [
      'Safe over WalletConnect (both keys)',
      { code: true, caps: { ...ATOMIC, ...LEGACY }, threshold: 2n },
      'multisigBatch',
    ],
    [
      'smart account with atomic and no getThreshold',
      { code: true, caps: ATOMIC, threshold: zeroDataError() },
      'atomicBatch',
    ],
    [
      'smart account with atomic whose getThreshold reverts',
      { code: true, caps: ATOMIC, threshold: revertError() },
      'atomicBatch',
    ],
    [
      'non-Safe contract with the legacy key only',
      { code: true, caps: LEGACY, threshold: zeroDataError() },
      'multisig',
    ],
    [
      'contract reporting threshold 0',
      { code: true, caps: LEGACY, threshold: 0n },
      'multisig',
    ],
  ])('%s, after one Safe probe', async (_label, opts, kind) => {
    const { wallet, readContract } = buildKind(opts);
    expect(await wallet.getWalletKind()).toBe(kind);
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  it('rejects when the Safe probe fails at the transport level', async () => {
    const { wallet } = buildKind({
      code: true,
      caps: LEGACY,
      threshold: transportError(),
    });
    await expect(wallet.getWalletKind()).rejects.toMatchObject({
      code: ERROR_CODE.NETWORK_ERROR,
    });
  });

  it('checksums a lowercase account before caps, getCode and the probe', async () => {
    const { wallet, getCapabilities, isContract, readContract } = buildKind({
      code: true,
      caps: LEGACY,
    });
    const checksummed = getAddress(ACCOUNT);
    expect(checksummed).not.toBe(ACCOUNT);
    await wallet.getWalletKind(ACCOUNT);
    expect(getCapabilities).toHaveBeenCalledWith({ account: checksummed });
    expect(isContract).toHaveBeenCalledWith(checksummed);
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: checksummed,
        functionName: 'getThreshold',
      }),
    );
  });
});
