import {
  CheckAllowanceResult,
  getEncodableContract,
  LidoSDKCore,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { erc20Abi, getContract, Hash } from 'viem';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index';
import {
  CACHE_IMMUTABLE,
  COMMON_ADDRESSES,
  CONTRACT_NAMES,
  EMPTY_PERMIT,
  Erc20Tokens,
  ERROR_CODE,
  invariant,
  PermitSignatureShort,
  SUPPORTED_CHAINS,
} from '../common/index';
import { BindedContract } from '../core-sdk/types';
import {
  AllowanceProps,
  AmountAndTokenProps,
  CallResult,
  SpendProps,
  TransactionCallback,
  TransactionCallbackStage,
} from '../tx-sdk/types';
import { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { parseSpendingProps } from './parse-spending-props';
import { stripPermit } from './strip-permit';
import { AllowanceSDKProps, WithSpender } from './types';

/** ERC20 allowance, EIP-2612 permit and approve flows for an explicit spender. */
export class AllowanceSDK {
  readonly core: LidoSDKCore;
  readonly wallet: WalletSDK;
  private readonly tokenAddresses?: AllowanceSDKProps['tokenAddresses'];

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
    const key = token as unknown as
      CONTRACT_NAMES.stETH | CONTRACT_NAMES.wstETH;
    const address =
      this.tokenAddresses?.[key] ?? COMMON_ADDRESSES[chainId]?.[key];
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

  @Logger('Call:')
  @ErrorHandler()
  public async approve(
    props: WithSpender<SpendProps>,
  ): Promise<TransactionResult> {
    const call = await this.getApproveCall({
      ...props.spend,
      spender: props.spender,
    });

    return this.wallet.sendTransaction({
      ...props,
      ...this.wallet.callToTransaction(call),
    });
  }

  public getApproveCall(props: WithSpender<AmountAndTokenProps>): CallResult {
    const { amount, token } = parseSpendingProps(props);
    return this.getTokenContract(token).encode.approve([props.spender, amount]);
  }

  @Logger('Utils:')
  public async signPermitOrApprove(props: WithSpender<SpendProps>) {
    const [{ needsApprove }, isMultisig] = await Promise.all([
      this.checkAllowance(props),
      this.wallet.isMultisig(props.account),
    ]);

    if (!needsApprove) {
      return { permit: EMPTY_PERMIT };
    }

    if (isMultisig) {
      const { hash } = await this.approve({
        ...props,
        callback: this.wrapApproveCallback(props),
      });
      return { permit: EMPTY_PERMIT, hash };
    } else {
      const permit = await this.signPermit(props);
      return { permit };
    }
  }

  private wrapApproveCallback({
    callback,
    spend,
  }: WithSpender<SpendProps>): TransactionCallback | undefined {
    if (!callback) return undefined;
    const { token, amount } = parseSpendingProps(spend);
    return (args) => {
      switch (args.stage) {
        case TransactionCallbackStage.SIGN:
          return callback({
            stage: TransactionCallbackStage.APPROVE_SIGN,
            payload: { token, amount },
          });
        case TransactionCallbackStage.RECEIPT:
          return callback({
            stage: TransactionCallbackStage.APPROVE_RECEIPT,
            payload: { token, amount, hash: (args.payload as any).hash },
          });
        case TransactionCallbackStage.MULTISIG_DONE:
          return callback(args);
        default:
      }
    };
  }

  /** Approve call to prepend to an AA batch, or undefined when allowance already covers the spend. */
  public async getApproveCallIfNeeded(
    props: WithSpender<SpendProps>,
  ): Promise<CallResult | undefined> {
    const { needsApprove } = await this.checkAllowance(props);
    if (!needsApprove) return undefined;
    return this.getApproveCall({ ...props.spend, spender: props.spender });
  }

  /** Permit to attach to an EOA call; `hash` set instead when a multisig approve was submitted. */
  public async resolvePermit(
    props: WithSpender<SpendProps>,
  ): Promise<{ permit?: PermitSignatureShort; hash?: Hash }> {
    if (props.spend.permit) return { permit: stripPermit(props.spend.permit) };
    const result = await this.signPermitOrApprove(props);
    return { hash: result.hash, permit: stripPermit(result.permit) };
  }
}
