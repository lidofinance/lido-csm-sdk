import {
  CheckAllowanceResult,
  ERROR_CODE,
  invariant,
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
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CSM_CONTRACT_NAMES,
  EMPTY_PERMIT,
  Erc20Tokens,
  STETH_ROUNDING_THRESHOLD,
  TOKEN_ADDRESS,
  TOKENS,
} from '../common/index.js';
import {
  AllowanceProps,
  AmountAndTokenProps,
  ApproveProps,
  CheckAllowanceProps,
  isMultisigProps,
  SignPermitOrApproveProps,
  SignPermitProps,
} from './types.js';
import { parseValue } from '../common/utils/parse-value.js';

export class SpendingSDK extends CsmSDKModule {
  protected get spender(): Address {
    return this.core.getContractAddress(CSM_CONTRACT_NAMES.csAccounting);
  }

  @Logger('Utils:')
  @Cache(30 * 60 * 1000)
  public getTokenAddress(contract: Erc20Tokens): Address {
    const address = TOKEN_ADDRESS[this.core.chainId]?.[contract];
    invariant(
      address,
      `Token contracts are not supported for ${this.core.chain.name}(${this.core.chain.id})`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  public getTokenContract(
    token: Erc20Tokens,
  ): GetContractReturnType<typeof erc20Abi, WalletClient> {
    return getContract({
      address: this.getTokenAddress(token),
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
    const { amount } = this.parseProps(props);

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
      const { hash } = await this.approve(props);
      return { permit: EMPTY_PERMIT, hash };
    } else {
      const permit = await this.signPermit(props);
      return { permit };
    }
  }

  /**
   * Add 10 wei for approve/permit request
   * for stETH only
   */
  private parseProps<T extends AmountAndTokenProps>(
    props: T,
  ): T & { amount: bigint } {
    const { token, amount: _amount } = props;
    let amount = parseValue(_amount);
    if (token === TOKENS.steth && amount > 0) {
      amount += STETH_ROUNDING_THRESHOLD;
    }
    return { ...props, amount };
  }
}
