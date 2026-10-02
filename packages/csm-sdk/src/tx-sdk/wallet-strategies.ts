import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import type { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { stripPermit } from '../allowance-sdk/strip-permit';
import { PermitSignatureShort } from '../common/index';
import type { WalletKind } from '../wallet-sdk/types';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { CallResult, PerformOptions, PerformOptionsSpend } from './types';

export type StrategyContext = {
  wallet: WalletSDK;
  allowance: AllowanceSDK;
  spender: Address;
  /** Builds and version-checks the call; `permit` is only meaningful for sendTransaction kinds. */
  prepare: (
    props: PerformOptions<any>,
    permit?: PermitSignatureShort,
  ) => Promise<CallResult>;
};

export type WalletStrategy = {
  perform<T>(
    ctx: StrategyContext,
    props: PerformOptions<T>,
  ): Promise<TransactionResult<T>>;
};

const performTransaction = async <T>(
  ctx: StrategyContext,
  kind: WalletKind,
  props: PerformOptions<T>,
): Promise<TransactionResult<T>> => {
  let permit: PermitSignatureShort | undefined;
  if (props.spend) {
    const spendProps = {
      ...(props as PerformOptionsSpend<T>),
      spender: ctx.spender,
    };
    if (props.spend.permit) {
      permit = stripPermit(props.spend.permit);
    } else {
      const resolved = await ctx.allowance.resolveSpendAs(kind, spendProps);
      if (resolved.hash) return { hash: resolved.hash };
      permit = stripPermit(resolved.permit);
    }
  }
  const call = await ctx.prepare(props, permit);
  return ctx.wallet.sendTransaction({
    ...props,
    ...ctx.wallet.callToTransaction(call),
    multisig: kind === 'multisig',
  });
};

export const WALLET_STRATEGIES: Record<WalletKind, WalletStrategy> = {
  eoa: { perform: (ctx, props) => performTransaction(ctx, 'eoa', props) },
  multisig: {
    perform: (ctx, props) => performTransaction(ctx, 'multisig', props),
  },
  atomicBatch: {
    async perform(ctx, props) {
      const calls: CallResult[] = [];
      if (props.spend) {
        const approveCall = await ctx.allowance.getApproveCallIfNeeded({
          ...(props as PerformOptionsSpend<any>),
          spender: ctx.spender,
        });
        if (approveCall) calls.push(approveCall);
      }
      calls.push(await ctx.prepare(props));
      return ctx.wallet.sendCalls({ ...props, calls });
    },
  },
};
