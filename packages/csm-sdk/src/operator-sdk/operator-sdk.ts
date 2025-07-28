import {
  Address,
  GetContractReturnType,
  isAddressEqual,
  WalletClient,
  zeroAddress,
} from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CSModuleAbi } from '../abi/CSModule.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { BondBalance, NodeOperatorId } from '../common/index.js';
import { clearEmptyAddress } from '../common/utils/clear-empty-address.js';
import { splitKeys } from '../common/utils/split-keys.js';
import { NodeOperatorInfo } from './types.js';
import { calcBondBalance } from './calc-bond-balance.js';
import { ParametersSDK } from '../parameters-sdk/parameters-sdk.js';
import { Cache } from '../common/decorators/cache.js';

export class OperatorSDK extends CsmSDKModule<{
  parameters: ParametersSDK;
}> {
  protected get accountingContract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.contractCSAccounting;
  }

  protected get moduleContract(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.core.contractCSModule;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurveId(id: NodeOperatorId): Promise<bigint> {
    return this.accountingContract.read.getBondCurveId([id]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondBalance(id: NodeOperatorId): Promise<BondBalance> {
    const [[current, required], locked] = await Promise.all([
      this.accountingContract.read.getBondSummary([id]),
      this.accountingContract.read.getActualLockedBond([id]),
    ]);

    return calcBondBalance({ current, required, locked });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLockedBond(id: NodeOperatorId): Promise<bigint> {
    return this.accountingContract.read.getActualLockedBond([id]);
  }

  @Cache(10 * 1000)
  @Logger('Views:')
  @ErrorHandler()
  public async getInfo(id: NodeOperatorId): Promise<NodeOperatorInfo> {
    const info = await this.moduleContract.read.getNodeOperator([id]);

    return {
      ...info,
      rewardsAddress: info.rewardAddress,
      proposedManagerAddress: clearEmptyAddress(info.proposedManagerAddress),
      proposedRewardsAddress: clearEmptyAddress(info.proposedRewardAddress),
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getKeys(id: NodeOperatorId, start = 0n, count?: bigint) {
    if (count === undefined) {
      const info = await this.getInfo(id);
      count = BigInt(info.totalAddedKeys) - start;
    }

    const keysString = await this.moduleContract.read.getSigningKeys([
      id,
      start,
      count,
    ]);

    return splitKeys(keysString);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysCountToMigrate(id: NodeOperatorId) {
    const [info, curveId] = await Promise.all([
      this.getInfo(id),
      this.getCurveId(id),
    ]);
    if (info.usedPriorityQueue) return 0;

    const [{ priority, maxDeposits }, legacyQueue] = await Promise.all([
      this.bus.getOrThrow('parameters').getQueueConfig(curveId),
      this.moduleContract.read.QUEUE_LEGACY_PRIORITY(),
    ]);

    if (BigInt(priority) >= legacyQueue) return 0;

    const deposited = info.totalDepositedKeys;

    if (maxDeposits <= deposited) return 0;
    return Math.min(maxDeposits - deposited, info.enqueuedCount);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getUnboundKeysCount(id: NodeOperatorId): Promise<bigint> {
    return this.accountingContract.read.getUnbondedKeysCountToEject([id]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOwner(id: NodeOperatorId): Promise<Address> {
    return this.moduleContract.read.getNodeOperatorOwner([id]);
  }

  @Logger('Utils:')
  public async isOwner(id: NodeOperatorId, address: Address): Promise<boolean> {
    const owner = await this.moduleContract.read.getNodeOperatorOwner([id]);
    return isAddressEqual(owner, address) && owner !== zeroAddress;
  }
}
