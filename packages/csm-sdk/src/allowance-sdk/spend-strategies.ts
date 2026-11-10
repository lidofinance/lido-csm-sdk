import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import type { Hash } from 'viem';
import { EMPTY_PERMIT, PermitSignatureShort } from '../common/index';
import {
  CallResult,
  SpendProps,
  TransactionCallback,
  TransactionCallbackStage,
} from '../tx-sdk/types';
import type { WalletKind } from '../wallet-sdk/types';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import type { AllowanceSDK } from './allowance-sdk';
import { parseSpendingProps } from './parse-spending-props';
import type { WithSpender } from './types';

export type SpendContext = {
  wallet: WalletSDK;
  allowance: AllowanceSDK;
};

export type SpendResolution = { permit: PermitSignatureShort; hash?: Hash };

export type SpendStrategy = {
  approve(
    ctx: SpendContext,
    props: WithSpender<SpendProps>,
  ): Promise<TransactionResult>;
  /** Permit to attach to the call, or `hash` of an approve that was sent instead. */
  signPermitOrApprove(
    ctx: SpendContext,
    props: WithSpender<SpendProps>,
  ): Promise<SpendResolution>;
};

// ERROR is not forwarded: the enclosing @ErrorHandler emits it once (WalletSDK send methods have no @ErrorHandler).
const wrapApproveCallback = ({
  callback,
  spend,
}: SpendProps): TransactionCallback | undefined => {
  if (!callback) return undefined;
  const { token, amount } = parseSpendingProps(spend);
  let receiptEmitted = false;
  return (args) => {
    switch (args.stage) {
      case TransactionCallbackStage.SIGN:
        return callback({
          stage: TransactionCallbackStage.APPROVE_SIGN,
          payload: { token, amount },
        });
      // sendCalls RECEIPT carries only `id`; its hash first appears in DONE.
      case TransactionCallbackStage.RECEIPT:
      case TransactionCallbackStage.DONE: {
        const { hash } = args.payload;
        if (!hash || receiptEmitted) return;
        receiptEmitted = true;
        return callback({
          stage: TransactionCallbackStage.APPROVE_RECEIPT,
          payload: { token, amount, hash },
        });
      }
      case TransactionCallbackStage.MULTISIG_DONE:
        return callback({
          stage: TransactionCallbackStage.MULTISIG_DONE,
          payload: { ...args.payload, approve: { token, amount } },
        });
      default:
    }
  };
};

const approveThenStop = async (
  ctx: SpendContext,
  props: WithSpender<SpendProps>,
  approve: (p: WithSpender<SpendProps>) => Promise<TransactionResult>,
): Promise<SpendResolution> => {
  const { needsApprove } = await ctx.allowance.checkAllowance(props);
  if (!needsApprove) return { permit: EMPTY_PERMIT };
  const { hash } = await approve({
    ...props,
    callback: wrapApproveCallback(props),
  });
  return { permit: EMPTY_PERMIT, hash };
};

const approveCall = (ctx: SpendContext, props: WithSpender<SpendProps>) =>
  ctx.allowance.getApproveCall({ ...props.spend, spender: props.spender });

const sendApprove = (
  ctx: SpendContext,
  props: WithSpender<SpendProps>,
  multisig: boolean,
) =>
  ctx.wallet.sendTransaction({
    ...props,
    ...ctx.wallet.callToTransaction(approveCall(ctx, props)),
    multisig,
  });

const sendApproveBatch = (ctx: SpendContext, props: WithSpender<SpendProps>) =>
  ctx.wallet.sendCalls({ ...props, calls: [approveCall(ctx, props)] });

const proposeApprove = (ctx: SpendContext, props: WithSpender<SpendProps>) =>
  ctx.wallet.proposeCalls({ ...props, calls: [approveCall(ctx, props)] });

export const getApproveCallIfNeeded = async (
  ctx: SpendContext,
  props: WithSpender<SpendProps>,
): Promise<CallResult | undefined> => {
  const { needsApprove } = await ctx.allowance.checkAllowance(props);
  return needsApprove ? approveCall(ctx, props) : undefined;
};

export const SPEND_STRATEGIES: Record<WalletKind, SpendStrategy> = {
  eoa: {
    approve: (ctx, props) => sendApprove(ctx, props, false),
    async signPermitOrApprove(ctx, props) {
      const { needsApprove } = await ctx.allowance.checkAllowance(props);
      if (!needsApprove) return { permit: EMPTY_PERMIT };
      return { permit: await ctx.allowance.signPermit(props) };
    },
  },
  multisig: {
    approve: (ctx, props) => sendApprove(ctx, props, true),
    signPermitOrApprove: (ctx, props) =>
      approveThenStop(ctx, props, (p) => sendApprove(ctx, p, true)),
  },
  multisigBatch: {
    approve: proposeApprove,
    signPermitOrApprove: (ctx, props) =>
      approveThenStop(ctx, props, (p) => proposeApprove(ctx, p)),
  },
  atomicBatch: {
    approve: sendApproveBatch,
    signPermitOrApprove: (ctx, props) =>
      approveThenStop(ctx, props, (p) => sendApproveBatch(ctx, p)),
  },
};
