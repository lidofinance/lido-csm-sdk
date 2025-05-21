import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { EMPTY_PERMIT, TOKENS, WithToken } from '../common/index.js';
import { parseDepositData } from '../common/utils/parse-deposit-data.js';
import { PermitSignature } from '../core-sdk/types.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import { AddKeysInnerProps, AddKeysProps, RemoveKeysProps } from './types.js';

export class KeysSDK extends CsmSDKModule<{
  spending: SpendingSDK;
}> {
  private get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysETH(props: AddKeysProps): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount: value,
      keysCount,
      publicKeys,
      signatures,
      permit,
      ...rest
    } = await this.parseProps(props);

    const args = [
      rest.account.address,
      nodeOperatorId,
      keysCount,
      publicKeys,
      signatures,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addValidatorKeysETH(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.addValidatorKeysETH(args, {
          value,
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysStETH(props: AddKeysProps): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    // FIXME: pass callback
    const permit = await this.getPermit(
      { token: TOKENS.steth, amount },
      _permit,
    );

    const args = [
      rest.account.address,
      nodeOperatorId,
      keysCount,
      publicKeys,
      signatures,
      permit,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addValidatorKeysStETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.addValidatorKeysStETH(args, options),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async addKeysWstETH(props: AddKeysProps): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      amount,
      keysCount,
      publicKeys,
      signatures,
      permit: _permit,
      ...rest
    } = await this.parseProps(props);

    // FIXME: pass callback
    const permit = await this.getPermit(
      { token: TOKENS.wsteth, amount },
      _permit,
    );

    const args = [
      rest.account.address,
      nodeOperatorId,
      keysCount,
      publicKeys,
      signatures,
      permit,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.addValidatorKeysWstETH(args, options),
      sendTransaction: (options) =>
        this.contract.write.addValidatorKeysWstETH(args, options),
    });
  }

  public async addKeys(
    props: WithToken<AddKeysProps>,
  ): Promise<TransactionResult> {
    const { token } = props;

    if (props.amount === 0n) {
      return this.addKeysStETH(props);
    }

    switch (token) {
      case TOKENS.eth:
        return this.addKeysETH(props);
      case TOKENS.steth:
        return this.addKeysStETH(props);
      case TOKENS.wsteth:
        return this.addKeysWstETH(props);
      default:
        throw new SDKError({
          message: 'unsupported token',
          code: ERROR_CODE.INVALID_ARGUMENT,
        });
    }
  }

  @Logger('Utils:')
  private async parseProps(props: AddKeysProps): Promise<AddKeysInnerProps> {
    const { keysCount, publicKeys, signatures } = parseDepositData(
      props.depositData,
    );
    const account = await this.core.core.useAccount(props.account);
    return {
      ...props,
      keysCount,
      publicKeys,
      signatures,
      account,
    };
  }

  // TODO: cast to PermitSignatureShort?
  @Logger('Utils:')
  private async getPermit(
    props: SignPermitOrApproveProps,
    preparedPermit?: PermitSignature,
  ) {
    if (preparedPermit) return preparedPermit;
    const result = await this.bus?.get('spending')?.signPermitOrApprove(props);
    return result?.permit ?? EMPTY_PERMIT;
  }

  @Logger('Call:')
  @ErrorHandler()
  public async removeKeys(props: RemoveKeysProps): Promise<TransactionResult> {
    const { nodeOperatorId, startIndex, keysCount, ...rest } = props;

    const args = [nodeOperatorId, startIndex, keysCount] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.removeKeys(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.removeKeys(args, {
          ...options,
        }),
    });
  }
}
