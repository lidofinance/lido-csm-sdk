import { Address, getAbiItem } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  NodeOperator,
  SUPPORTED_VERSION_BY_CONTRACT,
} from '../common/index.js';
import { EventRangeProps } from '../core-sdk/types.js';
import { reconstructNodeOperators } from './reconstruct.js';
import { CsmContractsWithVersion, CsmStatus, CsmVersions } from './types.js';

export class ModuleSDK extends CsmSDKModule {
  @Logger('Views:')
  @ErrorHandler()
  public async getStatus(): Promise<CsmStatus> {
    const csAccounting = this.core.getContractCSAccounting();
    const csModule = this.core.getContractCSModule();

    const [isPausedModule, isPausedAccounting] = await Promise.all([
      csModule.read.isPaused(),
      csAccounting.read.isPaused(),
    ]);

    return {
      isPausedModule,
      isPausedAccounting,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getVersions(): Promise<CsmVersions> {
    const csAccounting = this.core.getContractCSAccounting();
    const csModule = this.core.getContractCSModule();
    const csFeeDistributor = this.core.getContractCSFeeDistributor();

    const [module, accounting, feeDistributor] = await Promise.all([
      csModule.read.getInitializedVersion(),
      csAccounting.read.getInitializedVersion(),
      csFeeDistributor.read.getInitializedVersion(),
    ]);

    return {
      [CSM_CONTRACT_NAMES.csModule]: module,
      [CSM_CONTRACT_NAMES.csAccounting]: accounting,
      [CSM_CONTRACT_NAMES.csFeeDistributor]: feeDistributor,
    };
  }

  public async isVersionsSupported(): Promise<boolean> {
    const versions = await this.getVersions();

    return Object.keys(versions)
      .map(
        (key) =>
          SUPPORTED_VERSION_BY_CONTRACT[key as CsmContractsWithVersion] >=
          versions[key as CsmContractsWithVersion],
      )
      .every(Boolean);
  }

  @Logger('Events:')
  @ErrorHandler()
  public async getNodeOperatorsByAddress(
    address: Address,
    options: EventRangeProps,
  ): Promise<NodeOperator[]> {
    const contract = this.core.getContractCSModule();

    const logResults = await Promise.all([
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({ abi: contract.abi, name: 'NodeOperatorAdded' }),
        args: {
          managerAddress: address,
        },
        ...options,
      }),
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({ abi: contract.abi, name: 'NodeOperatorAdded' }),
        args: {
          rewardAddress: address,
        },
        ...options,
      }),
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({
          abi: contract.abi,
          name: 'NodeOperatorManagerAddressChanged',
        }),
        args: {
          oldAddress: address,
        },
        ...options,
      }),
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({
          abi: contract.abi,
          name: 'NodeOperatorManagerAddressChanged',
        }),
        args: {
          newAddress: address,
        },
        ...options,
      }),
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({
          abi: contract.abi,
          name: 'NodeOperatorRewardAddressChanged',
        }),
        args: {
          oldAddress: address,
        },
        ...options,
      }),
      this.core.loadEvents({
        address: contract.address,
        event: getAbiItem({
          abi: contract.abi,
          name: 'NodeOperatorRewardAddressChanged',
        }),
        args: {
          newAddress: address,
        },
        ...options,
      }),
    ]);

    const logs = logResults.flat();

    return reconstructNodeOperators(logs, address);
  }
}
