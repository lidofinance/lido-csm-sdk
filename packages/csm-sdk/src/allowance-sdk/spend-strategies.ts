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
  return (args) => {
    switch (args.stage) {
      case TransactionCallbackStage.SIGN:
        return callback({
          stage: TransactionCallbackStage.APPROVE_SIGN,
          payload: { token, amount },
        });
      case TransactionCallbackStage.RECEIPT: {
        const { hash } = args.payload;
        if (!hash) return;
        return callback({
          stage: TransactionCallbackStage.APPROVE_RECEIPT,
          payload: { token, amount, hash },
        });
      }
      case TransactionCallbackStage.MULTISIG_DONE:
        return callback(args);
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

const sendApprove = (
  ctx: SpendContext,
  props: WithSpender<SpendProps>,
  multisig: boolean,
) =>
  ctx.wallet.sendTransaction({
    ...props,
    ...ctx.wallet.callToTransaction(
      ctx.allowance.getApproveCall({ ...props.spend, spender: props.spender }),
    ),
    multisig,
  });

const sendApproveBatch = (ctx: SpendContext, props: WithSpender<SpendProps>) =>
  ctx.wallet.sendCalls({
    ...props,
    calls: [
      ctx.allowance.getApproveCall({ ...props.spend, spender: props.spender }),
    ],
  });

export const getApproveCallIfNeeded = async (
  ctx: SpendContext,
  props: WithSpender<SpendProps>,
): Promise<CallResult | undefined> => {
  const { needsApprove } = await ctx.allowance.checkAllowance(props);
  return needsApprove
    ? ctx.allowance.getApproveCall({ ...props.spend, spender: props.spender })
    : undefined;
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
  atomicBatch: {
    approve: sendApproveBatch,
    signPermitOrApprove: (ctx, props) =>
      approveThenStop(ctx, props, (p) => sendApproveBatch(ctx, p)),
  },
};
