import {
  CheckAllowanceResult,
  getEncodableContract,
  LidoSDKCore,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { erc20Abi, getContract } from 'viem';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index';
import {
  CACHE_IMMUTABLE,
  CONTRACT_NAMES,
  Erc20Tokens,
  ERROR_CODE,
  invariant,
  TOKENS,
  SUPPORTED_CHAINS,
} from '../common/index';
import { BindedContract } from '../core-sdk/types';
import type { WalletKind } from '../wallet-sdk/types';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import {
  AllowanceProps,
  AmountAndTokenProps,
  CallResult,
  SpendProps,
  TransactionCallbackStage,
} from '../tx-sdk/types';
import { parseSpendingProps } from './parse-spending-props';
import {
  getApproveCallIfNeeded,
  SPEND_STRATEGIES,
  SpendResolution,
} from './spend-strategies';
import { AllowanceSDKProps, WithSpender } from './types';

const TOKEN_CONTRACT = {
  [TOKENS.steth]: CONTRACT_NAMES.stETH,
  [TOKENS.wsteth]: CONTRACT_NAMES.wstETH,
} as const satisfies Record<Erc20Tokens, CONTRACT_NAMES>;

/** ERC20 allowance, EIP-2612 permit and approve flows for an explicit spender, per wallet kind. */
export class AllowanceSDK {
  readonly core: LidoSDKCore;
  readonly wallet: WalletSDK;
  private readonly tokenAddresses: AllowanceSDKProps['tokenAddresses'];

  constructor(props: AllowanceSDKProps) {
    this.core = props.core;
    this.wallet = props.wallet;
    this.tokenAddresses = props.tokenAddresses;
  }

  @Cache(CACHE_IMMUTABLE)
  private getTokenContract(
    token: Erc20Tokens,
  ): BindedContract<typeof erc20Abi> {
    const chainId = this.core.chain.id as SUPPORTED_CHAINS;
    const address = this.tokenAddresses[TOKEN_CONTRACT[token]];
    invariant(
      address,
      `Token [${token}] not configured on chain ${chainId}`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return getEncodableContract(
      getContract({ address, abi: erc20Abi, client: this.core.keyedClient }),
    ) as BindedContract<typeof erc20Abi>;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async allowance({
    account,
    token,
    spender,
  }: WithSpender<AllowanceProps>): Promise<bigint> {
    const { address } = await this.core.useAccount(account);
    return this.getTokenContract(token).read.allowance([address, spender]);
  }

  @Logger('Utils:')
  public async checkAllowance(
    props: WithSpender<SpendProps>,
  ): Promise<CheckAllowanceResult> {
    const { amount, token } = parseSpendingProps(props.spend);
    if (amount === 0n) {
      return {
        allowance: 0n,
        needsApprove: false,
      };
    }
    const allowance = await this.allowance({
      token,
      account: props.account,
      spender: props.spender,
    });
    const needsApprove = allowance < amount;
    return {
      allowance,
      needsApprove,
    };
  }

  @Logger('Permit:')
  @ErrorHandler()
  public async signPermit(props: WithSpender<SpendProps>) {
    const { token, amount, deadline } = parseSpendingProps(props.spend);

    await props.callback?.({
      stage: TransactionCallbackStage.PERMIT_SIGN,
      payload: { token, amount },
    });

    return this.core.signPermit({
      amount,
      token,
      deadline,
      spender: props.spender,
      account: props.account,
    });
  }

  public getApproveCall(props: WithSpender<AmountAndTokenProps>): CallResult {
    const { amount, token } = parseSpendingProps(props);
    return this.getTokenContract(token).encode.approve([props.spender, amount]);
  }

  @Logger('Call:')
  @ErrorHandler()
  public async approve(
    props: WithSpender<SpendProps>,
  ): Promise<TransactionResult> {
    return this.approveAs(
      await this.wallet.getWalletKind(props.account),
      props,
    );
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async signPermitOrApprove(
    props: WithSpender<SpendProps>,
  ): Promise<SpendResolution> {
    return this.resolveSpendAs(
      await this.wallet.getWalletKind(props.account),
      props,
    );
  }

  /** @internal Approve for an already-detected wallet kind; callers own error handling. */
  public approveAs(
    kind: WalletKind,
    props: WithSpender<SpendProps>,
  ): Promise<TransactionResult> {
    return SPEND_STRATEGIES[kind].approve(this.spendContext, props);
  }

  /** @internal Permit-or-approve for an already-detected wallet kind; callers own error handling. */
  public resolveSpendAs(
    kind: WalletKind,
    props: WithSpender<SpendProps>,
  ): Promise<SpendResolution> {
    return SPEND_STRATEGIES[kind].signPermitOrApprove(this.spendContext, props);
  }

  /** Approve call to prepend to an AA batch, or undefined when allowance already covers the spend. */
  public getApproveCallIfNeeded(
    props: WithSpender<SpendProps>,
  ): Promise<CallResult | undefined> {
    return getApproveCallIfNeeded(this.spendContext, props);
  }

  private get spendContext() {
    return { wallet: this.wallet, allowance: this };
  }
}
