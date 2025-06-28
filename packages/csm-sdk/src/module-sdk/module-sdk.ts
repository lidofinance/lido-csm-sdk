import { Address, GetContractReturnType, Hex, WalletClient } from 'viem';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  SUPPORTED_VERSION_BY_CONTRACT,
} from '../common/index.js';
import { onError } from './on-error.js';
import { CsmContractsWithVersion, CsmStatus, CsmVersions } from './types.js';

export class ModuleSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.getContractCSModule();
  }

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
    const [
      module,
      accounting,
      feeDistributor,
      parametersRegistry,
      strikes,
      vettedGate,
    ] = await Promise.all([
      this.core
        .getContractCSModule()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSAccounting()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSFeeDistributor()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSParametersRegistry()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractCSStrikes()
        .read.getInitializedVersion()
        .catch(onError),
      this.core
        .getContractVettedGate()
        .read.getInitializedVersion()
        .catch(onError),
    ]);

    return {
      [CSM_CONTRACT_NAMES.csModule]: module,
      [CSM_CONTRACT_NAMES.csAccounting]: accounting,
      [CSM_CONTRACT_NAMES.csFeeDistributor]: feeDistributor,
      [CSM_CONTRACT_NAMES.csParametersRegistry]: parametersRegistry,
      [CSM_CONTRACT_NAMES.csStrikes]: strikes,
      [CSM_CONTRACT_NAMES.vettedGate]: vettedGate,
    };
  }

  public async isVersionsSupported(): Promise<boolean> {
    const versions = await this.getVersions();

    return Object.entries(SUPPORTED_VERSION_BY_CONTRACT)
      .map(([key, [min, max]]) => {
        const current = versions[key as CsmContractsWithVersion];
        return current >= min && current <= max;
      })
      .every(Boolean);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorsCount(): Promise<bigint> {
    return this.contract.read.getNodeOperatorsCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getQueues() {
    const queuesCount = await this.contract.read.QUEUE_LOWEST_PRIORITY();
    const pointers = await Promise.all(
      Array.from({ length: Number(queuesCount) }, (_, i) =>
        this.contract.read.depositQueuePointers([BigInt(i)]),
      ),
    );
    return pointers.map(([head, tail]) => ({ head, tail }));
  }

  public async hasRole(address: Address, role: Hex): Promise<boolean> {
    return this.contract.read.hasRole([role, address]);
  }

  public async hasReportStealingRole(address: Address): Promise<boolean> {
    const role =
      await this.contract.read.REPORT_EL_REWARDS_STEALING_PENALTY_ROLE();
    return this.hasRole(address, role);
  }
}
