import {
  CheckAllowanceResult,
  NOOP,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import {
  Address,
  erc20Abi,
  getContract,
  GetContractReturnType,
  WalletClient,
} from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CSM_CONTRACT_NAMES,
  EMPTY_PERMIT,
  Erc20Tokens,
  STETH_ROUNDING_THRESHOLD,
  TOKENS,
} from '../common/index.js';
import {
  TransactionCallback,
  TransactionCallbackStage,
} from '../core-sdk/types.js';
import {
  AllowanceProps,
  AmountAndTokenProps,
  ApproveProps,
  CheckAllowanceProps,
  isMultisigProps,
  SignPermitOrApproveProps,
  SignPermitProps,
} from './types.js';

export class SpendingSDK extends CsmSDKModule {
  protected get spender(): Address {
    return this.core.getContractAddress(CSM_CONTRACT_NAMES.csAccounting);
  }

  public getTokenContract(
    token: Erc20Tokens,
  ): GetContractReturnType<typeof erc20Abi, WalletClient> {
    return getContract({
      address: this.core.getContractAddress(token),
      abi: erc20Abi,
      client: {
        public: this.core.core.rpcProvider,
        wallet: this.core.core.web3Provider as WalletClient,
      },
    });
  }

  @Logger('Permit:')
  @ErrorHandler()
  public async signPermit(props: SignPermitProps) {
    const { token, amount, callback = NOOP } = this.parseProps(props);

    await callback({
      stage: TransactionCallbackStage.PERMIT_SIGN,
      payload: { token, amount },
    });

    // TODO: set default deadline if not provided
    // TODO: convert to short version of permit signature?
    return this.core.core.signPermit({
      ...props,
      amount,
      spender: this.spender,
    });
  }

  @Logger('Views:')
  public async allowance({
    account: accountProp,
    token,
  }: AllowanceProps): Promise<bigint> {
    const account = await this.core.core.useAccount(accountProp);
    const contract = this.getTokenContract(token);

    return contract.read.allowance([account.address, this.spender]);
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async checkAllowance(
    props: CheckAllowanceProps,
  ): Promise<CheckAllowanceResult> {
    const { amount, ...rest } = this.parseProps(props);
    if (amount === 0n) {
      return {
        allowance: 0n,
        needsApprove: false,
      };
    }
    const allowance = await this.allowance(rest);
    const needsApprove = allowance < amount;
    return {
      allowance,
      needsApprove,
    };
  }

  @Logger('Call:')
  @ErrorHandler()
  public async approve(props: ApproveProps): Promise<TransactionResult> {
    const { amount, token, ...rest } = this.parseProps(props);

    const contract = this.getTokenContract(token);
    const txArguments = [this.spender, amount] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        contract.estimateGas.approve(txArguments, options),
      sendTransaction: (options) =>
        contract.write.approve(txArguments, options),
    });
  }

  @Logger('Views:')
  public async isMultisig(props: isMultisigProps): Promise<boolean> {
    const account = await this.core.core.useAccount(props.account);
    return this.core.core.isContract(account.address);
  }

  @Logger('Utils:')
  public async signPermitOrApprove(props: SignPermitOrApproveProps) {
    const { needsApprove } = await this.checkAllowance(props);
    if (!needsApprove) {
      return { permit: EMPTY_PERMIT };
    }
    const account = await this.core.core.useAccount(props.account);
    const isMultisig = await this.core.core.isContract(account.address);

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
    ...props
  }: ApproveProps): TransactionCallback | undefined {
    if (!callback) return undefined;
    const { token, amount } = this.parseProps(props);
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
            payload: { token, amount, hash: args.payload.hash },
          });
        case TransactionCallbackStage.MULTISIG_DONE:
          return callback(args);
        default:
      }
    };
  }

  /**
   * Add 10 wei for approve/permit request
   * for stETH only
   */
  private parseProps<T extends AmountAndTokenProps>(
    props: T,
  ): T & { amount: bigint } {
    let { amount } = props;
    if (props.token === TOKENS.steth && amount > 0) {
      amount += STETH_ROUNDING_THRESHOLD;
    }
    return { ...props, amount };
  }
}
