import { TransactionResult } from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { ChangeRoleProps, ConfirmRoleProps, ResetRoleProps } from './types.js';

export class RolesSDK extends CsmSDKModule {
  private get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

  @Logger('Call:')
  @ErrorHandler()
  public async changeRewardsRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.changeNodeOperatorRewardAddress(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.changeNodeOperatorRewardAddress(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeManagerRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.proposeNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.proposeNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async proposeRewardsRole(
    props: ChangeRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, address, ...rest } = props;

    const args = [nodeOperatorId, address] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.proposeNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.contract.write.proposeNodeOperatorManagerAddressChange(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async resetManagerRole(
    props: ResetRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.resetNodeOperatorManagerAddress(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.resetNodeOperatorManagerAddress(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmRewardsRole(
    props: ConfirmRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.confirmNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
      sendTransaction: (options) =>
        this.contract.write.confirmNodeOperatorRewardAddressChange(args, {
          ...options,
        }),
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async confirmManagerRole(
    props: ConfirmRoleProps,
  ): Promise<TransactionResult> {
    const { nodeOperatorId, ...rest } = props;

    const args = [nodeOperatorId] as const;

    return this.core.performTransaction({
      ...rest,
      getGasLimit: (options) =>
        this.contract.estimateGas.confirmNodeOperatorManagerAddressChange(
          args,
          {
            ...options,
          },
        ),
      sendTransaction: (options) =>
        this.contract.write.confirmNodeOperatorManagerAddressChange(args, {
          ...options,
        }),
    });
  }
}
