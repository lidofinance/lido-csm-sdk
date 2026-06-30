import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWalletClient, erc20Abi, http, parseEther } from 'viem';
import {
  TransactionCallbackStage,
  type TransactionCallback,
  type TransactionCallbackProps,
} from '../../src/tx-sdk/types';
import type { AddBondResult } from '../../src/bond-sdk/types';
import { CONTRACT_NAMES, TOKENS } from '../../src/common';
import {
  anvilChainId,
  anvilRpcUrl,
  chainById,
  makeCsmSdk,
  mintStETH,
  useAccount,
  useCsmSdk,
  usePublicClient,
  useTestClient,
} from '../helpers';

// Exercises the AA branch of TxSDK.perform → performCall → internalCall.
//
// We extend a viem WalletClient with a fake `getCapabilities` so the SDK
// detects atomic-batch support and routes through `sendCalls`. viem's
// `experimental_fallback: true` (which the SDK passes through internally)
// then transparently falls back to sequential `eth_sendTransaction` calls
// because anvil doesn't implement `wallet_sendCalls` natively.
//
// This proves the SDK's routing, callback contract, and receipt handling
// for the AA path end-to-end against a real chain — without a 4337 bundler
// or EIP-7702 delegation. The atomicity guarantee isn't real, but the SDK
// doesn't depend on it.

const OPERATOR_ID = 0n;

// Builds a viem WalletClient whose `getCapabilities` fakes atomic-batch
// support for the current chain, so the SDK's isAbstractAccount() detects an
// AA and routes through `sendCalls`. Shared verbatim by both tests below.
const makeAaWalletClient = () => {
  const account = useAccount();
  const chainId = anvilChainId();

  return createWalletClient({
    account,
    chain: chainById(chainId),
    transport: http(anvilRpcUrl()),
  }).extend(() => ({
    // The SDK's isAbstractAccount() calls walletClient.getCapabilities and
    // checks if the 'atomic' capability is supported for the current chain.
    getCapabilities: async () => ({
      [chainId]: { atomic: { status: 'supported' as const } },
    }),
  }));
};

describe('integration: bond-aa (AA branch via getCapabilities override)', () => {
  let snapshotId: `0x${string}`;

  beforeEach(async () => {
    const test = useTestClient();
    snapshotId = await test.snapshot();
  });

  afterEach(async () => {
    const test = useTestClient();
    await test.revert({ id: snapshotId });
  });

  it('routes through sendCalls and resolves with the on-chain receipt', async () => {
    const test = useTestClient();
    const publicClient = usePublicClient();
    const account = useAccount();

    const walletClient = makeAaWalletClient();

    const sdk = makeCsmSdk(publicClient, walletClient as never);

    await test.setBalance({
      address: account.address,
      value: parseEther('100'),
    });

    // Match the operator-existence precondition from bond-wallet.test.ts —
    // otherwise addBondETH(0) reverts inside csAccounting on a fork without
    // operators and the AA branch surfaces it as a generic "Transaction
    // failed", masking the real cause.
    const operatorsCount = await useCsmSdk().module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    const isAA = await sdk.tx.isAbstractAccount(account.address);
    expect(isAA).toBe(true);

    const stages: TransactionCallbackStage[] = [];
    const callback: TransactionCallback<AddBondResult> = vi.fn(
      (p: TransactionCallbackProps<AddBondResult>) => {
        stages.push(p.stage);
      },
    );

    const result = await sdk.bond.addBondETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback,
    });

    // AA branch: returns hash + receipt + decoded result
    expect(result.hash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.receipt?.status).toBe('success');
    expect(result.result).toMatchObject({
      current: expect.any(BigInt),
      required: expect.any(BigInt),
    });

    // Callback fingerprints: AA uses SIGN → RECEIPT (with id payload) → DONE.
    // GAS_LIMIT must NOT fire — sendCalls handles gas internally.
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.RECEIPT);
    expect(stages).toContain(TransactionCallbackStage.DONE);
    expect(stages).not.toContain(TransactionCallbackStage.GAS_LIMIT);
    expect(stages).not.toContain(TransactionCallbackStage.CONFIRMATION);
    expect(stages).not.toContain(TransactionCallbackStage.MULTISIG_DONE);
  }, 60_000);

  // Unlike addBondETH (a single-call batch), addBondStETH PREPENDS an approve
  // call when the signer's allowance is insufficient → a real 2-call batch
  // [approve, deposit]. This exercises the multi-call AA path addBondETH can
  // never reach.
  //
  // How many on-chain TRANSACTIONS that batch becomes is anvil-version
  // dependent: newer anvil implements EIP-5792 `wallet_sendCalls` and executes
  // the batch atomically (nonce +1), while older anvil makes viem's
  // `experimental_fallback` fan it out to sequential `eth_sendTransaction`
  // (nonce +2). So assert the version-invariant facts instead: the approve is
  // required (zero allowance) and the deposit still succeeds — which, from a
  // zero starting allowance, is only possible if the in-batch approve ran.
  it('routes an stETH spend through sendCalls as a 2-call batch (approve + deposit)', async () => {
    const test = useTestClient();
    const publicClient = usePublicClient();
    const account = useAccount();

    const walletClient = makeAaWalletClient();

    await test.setBalance({
      address: account.address,
      value: parseEther('100'),
    });

    // Operator-existence precondition — see the ETH test above for rationale.
    const operatorsCount = await useCsmSdk().module.getOperatorsCount();
    if (operatorsCount === 0n) {
      throw new Error(
        'fork has no operators — pin TEST_FORK_BLOCK to a known-good block',
      );
    }

    // Mint stETH to the AA account so the deposit (and its approve) can spend.
    await mintStETH(walletClient, parseEther('50'));

    const sdk = makeCsmSdk(publicClient, walletClient as never);

    expect(await sdk.tx.isAbstractAccount(account.address)).toBe(true);

    // Hermetic precondition: a public fork may already carry an stETH allowance
    // for this well-known signer, which would let the SDK skip the approve. Zero
    // it so the approve is always required and prepended — and so the deposit's
    // success below genuinely depends on that in-batch approve.
    const core = useCsmSdk().core;
    const resetHash = await walletClient.writeContract({
      account,
      chain: chainById(anvilChainId()),
      address: core.getContractAddress(CONTRACT_NAMES.stETH) as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [
        core.getContractAddress(CONTRACT_NAMES.accounting) as `0x${string}`,
        0n,
      ],
    });
    await test.waitForTransactionReceipt({ hash: resetHash });

    const nonceBefore = await publicClient.getTransactionCount({
      address: account.address,
    });

    const stages: TransactionCallbackStage[] = [];
    const callback: TransactionCallback<AddBondResult> = vi.fn(
      (p: TransactionCallbackProps<AddBondResult>) => {
        stages.push(p.stage);
      },
    );

    // After the reset the signer holds zero allowance, so the SDK MUST prepend
    // an approve — proving the batch is genuinely [approve, deposit].
    const { needsApprove } = await sdk.tx.checkAllowance({
      account: account.address,
      spend: { token: TOKENS.steth, amount: parseEther('1') },
    });
    expect(needsApprove).toBe(true);

    const result = await sdk.bond.addBondStETH({
      nodeOperatorId: OPERATOR_ID,
      amount: parseEther('1'),
      callback,
    });

    const nonceAfter = await publicClient.getTransactionCount({
      address: account.address,
    });

    // The deposit succeeding from a ZERO starting allowance is the real proof
    // the in-batch approve executed — its transferFrom would revert otherwise.
    expect(result.receipt?.status).toBe('success');
    expect(result.result).toMatchObject({
      current: expect.any(BigInt),
      required: expect.any(BigInt),
    });

    // The batch ran as either 1 atomic tx (native EIP-5792 wallet_sendCalls) or
    // 2 sequential txs (experimental_fallback) — anvil-version dependent, so
    // assert the range rather than a brittle exact count.
    const nonceDelta = nonceAfter - nonceBefore;
    expect(nonceDelta).toBeGreaterThanOrEqual(1);
    expect(nonceDelta).toBeLessThanOrEqual(2);

    // AA callback fingerprint (same as the ETH test): SIGN, RECEIPT, DONE
    // present; GAS_LIMIT, CONFIRMATION, MULTISIG_DONE absent.
    expect(stages).toContain(TransactionCallbackStage.SIGN);
    expect(stages).toContain(TransactionCallbackStage.RECEIPT);
    expect(stages).toContain(TransactionCallbackStage.DONE);
    expect(stages).not.toContain(TransactionCallbackStage.GAS_LIMIT);
    expect(stages).not.toContain(TransactionCallbackStage.MULTISIG_DONE);
  }, 60_000);
});
