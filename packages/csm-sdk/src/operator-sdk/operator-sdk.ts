import { Address, isAddressEqual, zeroAddress } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  BondBalance,
  CACHE_SHORT,
  NodeOperatorId,
  NodeOperatorShortInfo,
} from '../common/index.js';
import { clearEmptyAddress } from '../common/utils/clear-empty-address.js';
import { splitKeys } from '../common/utils/split-keys.js';
import { calcBondBalance } from './calc-bond-balance.js';
import { NodeOperatorInfo } from './types.js';

export class OperatorSDK extends CsmSDKModule {
  private get accountingContract() {
    return this.core.contractAccounting;
  }

  private get moduleContract() {
    return this.core.contractBaseModule;
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

  @Cache(CACHE_SHORT)
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
  @Cache(CACHE_SHORT)
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
  public async getUnboundKeysCount(id: NodeOperatorId): Promise<number> {
    const value =
      await this.accountingContract.read.getUnbondedKeysCountToEject([id]);
    return Number(value);
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

  @Logger('Views:')
  @ErrorHandler()
  public async getManagementProperties(
    id: NodeOperatorId,
  ): Promise<NodeOperatorShortInfo> {
    const properties =
      await this.moduleContract.read.getNodeOperatorManagementProperties([id]);

    // TODO: review for CM
    return {
      nodeOperatorId: id,
      managerAddress: properties.managerAddress,
      rewardsAddress: properties.rewardAddress,
      extendedManagerPermissions: properties.extendedManagerPermissions,
    };
  }
}
