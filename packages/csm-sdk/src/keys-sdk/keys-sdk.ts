import {
  ERROR_CODE,
  SDKError,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient, zeroAddress } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  EMPTY_PERMIT,
  PermitSignatureShort,
  TOKENS,
  WithToken,
} from '../common/index.js';
import { parseDepositData } from '../common/utils/parse-deposit-data.js';
import { stripPermit } from '../common/utils/strip-permit.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { SignPermitOrApproveProps } from '../spending-sdk/types.js';
import {
  AddKeysInnerProps,
  AddKeysProps,
  EjectKeysByArrayProps,
  EjectKeysProps,
  MigrateKeysProps,
  RemoveKeysProps,
} from './types.js';

export class KeysSDK extends CsmSDKModule<{
  spending: SpendingSDK;
}> {
  private get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  private get ejectorContract() {
    return this.core.getContractCSEjector();
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

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.steth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

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

    const { hash, permit } = await this.getPermit(
      { token: TOKENS.wsteth, amount, ...rest } as any,
      _permit,
    );
    if (hash) return { hash };

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

  @Logger('Utils:')
  private async getPermit(
    props: SignPermitOrApproveProps,
    preparedPermit?: PermitSignatureShort,
  ) {
    if (preparedPermit) return { permit: stripPermit(preparedPermit) };
    const result = await this.bus?.get('spending')?.signPermitOrApprove(props);
    return {
      hash: result?.hash,
      permit: stripPermit(result?.permit ?? EMPTY_PERMIT),
    };
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

  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeys(props: EjectKeysProps): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      startIndex,
      keysCount,
      amount: value,
      refundRecipient = zeroAddress,
      ...rest
    } = props;

    const args = [
      nodeOperatorId,
      startIndex,
      keysCount,
      refundRecipient,
    ] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.ejectorContract.estimateGas.voluntaryEject(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.ejectorContract.write.voluntaryEject(args, {
          value,
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async ejectKeysByArray(
    props: EjectKeysByArrayProps,
  ): Promise<TransactionResult> {
    const {
      nodeOperatorId,
      keyIndices,
      amount: value,
      refundRecipient = zeroAddress,
      ...rest
    } = props;

    const args = [nodeOperatorId, keyIndices, refundRecipient] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.ejectorContract.estimateGas.voluntaryEjectByArray(args, {
          value,
          ...options,
        }),
      sendTransaction: (options) =>
        this.ejectorContract.write.voluntaryEjectByArray(args, {
          value,
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async migrateToPriorityQueue(
    props: MigrateKeysProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.migrateToPriorityQueue(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.migrateToPriorityQueue(args, {
          ...options,
        }),
    });
  }
}
