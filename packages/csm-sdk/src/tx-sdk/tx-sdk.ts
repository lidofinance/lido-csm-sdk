import {
  AccountValue,
  CheckAllowanceResult,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { Address, Call } from 'viem';
import type { AllowanceSDK } from '../allowance-sdk/allowance-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { ErrorHandler, Logger } from '../common/decorators/index';
import {
  CONTRACT_NAMES,
  EMPTY_PERMIT,
  ERROR_CODE,
  PermitSignatureShort,
  SDKError,
} from '../common/index';
import type { WalletSDK } from '../wallet-sdk/wallet-sdk';
import { SendCallsProps, SendTransactionProps } from '../wallet-sdk/types';
import {
  AllowanceProps,
  CallResult,
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
  SpendProps,
} from './types';

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
    const result = await this.bus.allowance.approve(this.withSpender(props));
    if (result.receipt) this.core.invalidateCache();
    return result;
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

  @Logger('Call:')
  @ErrorHandler()
  public async perform<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const account = await this.core.core.useAccount(props.account);
    const isAA = await this.isAbstractAccount(account.address);
    return isAA ? this.performCall(props) : this.performTransaction(props);
  }

  private async performCall<T>(
    props: PerformOptions<T>,
  ): Promise<TransactionResult<T>> {
    const calls: Call[] = [];
    if (props.spend) {
      const approveCall = await this.bus.allowance.getApproveCallIfNeeded(
        this.withSpender(props as PerformOptionsSpend<T>),
      );
      if (approveCall) calls.push(approveCall);
    }
    const call = await this.prepareCall(props);
    await this.checkVersion(call);
    calls.push(call);
    return this.sendCalls({ ...props, calls });
  }

  private async performTransaction<T>(
    props: PerformOptions<T>,
  ): Promise<TransactionResult<T>> {
    const { hash, permit } = props.spend
      ? await this.bus.allowance.resolvePermit(
          this.withSpender(props as PerformOptionsSpend<T>),
        )
      : {};
    if (hash) return { hash };
    const call = await this.prepareCall(props, { permit });
    await this.checkVersion(call);
    return this.sendTransaction({
      ...props,
      ...this.bus.wallet.callToTransaction(call),
    });
  }

  private async sendCalls<T>(
    props: SendCallsProps<T>,
  ): Promise<TransactionResult<T>> {
    const result = await this.bus.wallet.sendCalls(props);
    this.core.invalidateCache();
    return result;
  }

  // A multisig submission resolves to `{ hash }` only; state hasn't changed yet.
  private async sendTransaction<T>(
    props: SendTransactionProps<T>,
  ): Promise<TransactionResult<T>> {
    const result = await this.bus.wallet.sendTransaction(props);
    if (result.receipt) this.core.invalidateCache();
    return result;
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
