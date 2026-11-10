import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import type { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { isAllowanceExceeded } from '../allowance-sdk/is-allowance-exceeded';
import { parseSpendingProps } from '../allowance-sdk/parse-spending-props';
import { stripPermit } from '../allowance-sdk/strip-permit';
import {
  ERROR_CODE,
  Erc20Tokens,
  PermitSignatureShort,
  SDKError,
} from '../common/index';
import type { SendCallsProps, WalletKind } from '../wallet-sdk/types';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { PERMIT_GAS_OVERHEAD } from './consts';
import {
  CallResult,
  GasEstimate,
  GasEstimateUnlock,
  PerformOptions,
  PerformOptionsSpend,
} from './types';

export type EstimateProps<T = any> = PerformOptions<T> & { account: Address };

export type StrategyContext = {
  wallet: WalletSDK;
  allowance: AllowanceSDK;
  spender: Address;
  /** Builds and version-checks the call; `permit` is honoured by sendTransaction kinds and by `multisigBatch` via `proposeCalls`. */
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
  estimate<T>(
    ctx: StrategyContext,
    props: EstimateProps<T>,
  ): Promise<GasEstimate>;
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

const performBatch = async <T>(
  ctx: StrategyContext,
  props: PerformOptions<T>,
  opts: {
    honourPermit: boolean;
    send: (p: SendCallsProps<T>) => Promise<TransactionResult<T>>;
  },
): Promise<TransactionResult<T>> => {
  const permit = props.spend?.permit;
  if (opts.honourPermit && permit) {
    const call = await ctx.prepare(props, stripPermit(permit));
    return opts.send({ ...props, calls: [call] });
  }
  const [approveCall, call] = await Promise.all([
    props.spend
      ? ctx.allowance.getApproveCallIfNeeded({
          ...(props as PerformOptionsSpend<any>),
          spender: ctx.spender,
        })
      : undefined,
    ctx.prepare(props),
  ]);
  return opts.send({
    ...props,
    calls: approveCall ? [approveCall, call] : [call],
  });
};

const estimateWithOverride = async (
  ctx: StrategyContext,
  call: CallResult,
  override: { token: Erc20Tokens; amount: bigint; account: Address },
): Promise<bigint> => {
  const target = { ...override, spender: ctx.spender };
  try {
    return await ctx.wallet.estimateGas(call, {
      account: target.account,
      stateOverride: ctx.allowance.getAllowanceOverride(target),
    });
  } catch (error) {
    if (!isAllowanceExceeded(error)) throw error;
    if (await ctx.allowance.isAllowanceOverrideApplied(target)) throw error;
    throw new SDKError({
      code: ERROR_CODE.NOT_SUPPORTED,
      message:
        'eth_estimateGas stateOverride not applied: RPC ignored it or token allowance slot differs',
      error,
    });
  }
};

const estimateTransaction = async <T>(
  ctx: StrategyContext,
  kind: WalletKind,
  props: EstimateProps<T>,
): Promise<GasEstimate> => {
  const { account } = props;
  const done = (main: bigint, unlock?: GasEstimateUnlock): GasEstimate => ({
    main,
    unlock,
    total: main + (unlock?.gas ?? 0n),
    walletKind: kind,
  });
  const plain = async (permit?: PermitSignatureShort) =>
    done(
      await ctx.wallet.estimateGas(await ctx.prepare(props, permit), {
        account,
      }),
    );

  if (!props.spend) return plain();

  // atomicBatch perform never uses a caller permit (approve + call batch)
  if (props.spend.permit && kind !== 'atomicBatch') {
    return plain(stripPermit(props.spend.permit));
  }

  const [approveCall, call] = await Promise.all([
    ctx.allowance.getApproveCallIfNeeded({
      ...(props as PerformOptionsSpend<any>),
      spender: ctx.spender,
    }),
    ctx.prepare(props),
  ]);
  if (!approveCall)
    return done(await ctx.wallet.estimateGas(call, { account }));

  const { token, amount } = parseSpendingProps(props.spend);
  const estimateMain = () =>
    estimateWithOverride(ctx, call, { token, amount, account });

  if (kind === 'eoa') {
    return done(await estimateMain(), {
      kind: 'permit',
      gas: PERMIT_GAS_OVERHEAD[token],
    });
  }
  const [main, gas] = await Promise.all([
    estimateMain(),
    ctx.wallet.estimateGas(approveCall, { account }),
  ]);
  return done(main, { kind: 'approve', gas });
};

export const WALLET_STRATEGIES: Record<WalletKind, WalletStrategy> = {
  eoa: {
    perform: (ctx, props) => performTransaction(ctx, 'eoa', props),
    estimate: (ctx, props) => estimateTransaction(ctx, 'eoa', props),
  },
  multisig: {
    perform: (ctx, props) => performTransaction(ctx, 'multisig', props),
    estimate: (ctx, props) => estimateTransaction(ctx, 'multisig', props),
  },
  multisigBatch: {
    perform: (ctx, props) =>
      performBatch(ctx, props, {
        honourPermit: true,
        send: (p) => ctx.wallet.proposeCalls(p),
      }),
    estimate: (ctx, props) => estimateTransaction(ctx, 'multisigBatch', props),
  },
  atomicBatch: {
    perform: (ctx, props) =>
      performBatch(ctx, props, {
        honourPermit: false,
        send: (p) => ctx.wallet.sendCalls(p),
      }),
    estimate: (ctx, props) => estimateTransaction(ctx, 'atomicBatch', props),
  },
};
