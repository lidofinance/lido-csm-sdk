import {
  AccountValue,
  CheckAllowanceResult,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { Address } from 'viem';
import type { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { ErrorHandler, Logger } from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  EMPTY_PERMIT,
  ERROR_CODE,
  invariantArgument,
  PermitSignatureShort,
  SDKError,
} from '../common/index';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import {
  AllowanceProps,
  CallResult,
  GasEstimate,
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
  SpendProps,
} from './types';
import { StrategyContext, WALLET_STRATEGIES } from './wallet-strategies';

/** Module-scoped transaction orchestration: permit/approve for this module's accounting, version check, send. */
export class TxSDK extends CsmSDKModule<{
  wallet: WalletSDK;
  allowance: AllowanceSDK;
}> {
  protected get spender(): Address {
    return this.core.getContractAddress(CONTRACT_NAMES.accounting);
  }

  private withSpender<T extends object>(props: T): T & { spender: Address } {
    return { ...props, spender: this.spender };
  }

  public isAbstractAccount(account: Address): Promise<boolean> {
    return this.bus.wallet.isAbstractAccount(account);
  }

  public isMultisig(account?: AccountValue): Promise<boolean> {
    return this.bus.wallet.isMultisig(account);
  }

  public allowance(props: AllowanceProps): Promise<bigint> {
    return this.bus.allowance.allowance(this.withSpender(props));
  }

  public checkAllowance(props: SpendProps): Promise<CheckAllowanceResult> {
    return this.bus.allowance.checkAllowance(this.withSpender(props));
  }

  public signPermit(props: SpendProps) {
    return this.bus.allowance.signPermit(this.withSpender(props));
  }

  @Logger('Call:')
  @ErrorHandler()
  public async approve(props: SpendProps): Promise<TransactionResult> {
    return this.bus.allowance.approve(this.withSpender(props));
  }

  public signPermitOrApprove(props: SpendProps) {
    return this.bus.allowance.signPermitOrApprove(this.withSpender(props));
  }

  public async perform<TDecodedResult = undefined>(
    props: PerformOptionsSpend<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>>;
  public async perform<TDecodedResult = undefined>(
    props: PerformOptionsNoSpend<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>>;
  public async perform<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>>;

  @Logger('Call:')
  @ErrorHandler()
  public async perform<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const kind = await this.bus.wallet.getWalletKind(props.account);
    return WALLET_STRATEGIES[kind].perform(this.context, props);
  }

  /** Pre-flight `eth_estimateGas` of the call and its allowance step. Signs and sends nothing; callbacks are never invoked. */
  @Logger('Views:')
  @ErrorHandler('Error:', { notify: false })
  public async estimate(props: PerformOptions<any>): Promise<GasEstimate> {
    const account = this.resolveEstimateAccount(props.account);
    const kind = await this.bus.wallet.getWalletKind(account);
    return WALLET_STRATEGIES[kind].estimate(this.context, {
      ...props,
      account,
    });
  }

  // never prompts the wallet (no requestAddresses)
  private resolveEstimateAccount(account?: AccountValue): Address {
    const address =
      typeof account === 'string'
        ? account
        : (account?.address ?? this.defaultAccountAddress);
    invariantArgument(address, 'account required for estimate');
    return address;
  }

  private get context(): StrategyContext {
    return {
      wallet: this.bus.wallet,
      allowance: this.bus.allowance,
      spender: this.spender,
      prepare: async (props, permit) => {
        const call = await this.prepareCall(props, permit && { permit });
        await this.checkVersion(call);
        return call;
      },
    };
  }

  private async prepareCall(
    props: PerformOptions<any>,
    options?: { permit?: PermitSignatureShort },
  ): Promise<CallResult> {
    const account = await this.core.core.useAccount(props.account);
    return props.call({
      from: account.address,
      permit: EMPTY_PERMIT,
      ...options,
    } as any);
  }

  @Logger('Utils:')
  private async checkVersion(callResult: CallResult): Promise<void> {
    const contractName = this.core.getContractNameByAddress(callResult.to);
    if (!contractName) return;
    const result = await this.core.checkContractVersion(contractName);
    if (!result.supported) {
      throw new SDKError({
        code: ERROR_CODE.NOT_SUPPORTED,
        message: `Contract ${contractName} version ${result.version} not supported`,
      });
    }
  }
}
