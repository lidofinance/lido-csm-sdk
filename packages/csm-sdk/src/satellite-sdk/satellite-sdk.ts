import { isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ROLES } from '../common/constants/roles.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  NodeOperator,
  NodeOperatorId,
  NodeOperatorInvite,
} from '../common/types.js';
import { packRoles } from '../events-sdk/merge.js';
import {
  FindOperatorIdsProps,
  GetDepositableKeysCountProps,
  GetNodeOperatorsProps,
  GetQueueBatchesProps,
  SearchMode,
} from './types.js';

export class SatelliteSDK extends CsmSDKModule {
  private get satelliteContract() {
    return this.core.contractCSMSatellite;
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getNodeOperatorIds({
    address,
    offset = 0n,
    limit = 1000n,
    searchMode = SearchMode.CURRENT_ADDRESSES,
  }: FindOperatorIdsProps): Promise<NodeOperatorId[]> {
    const result = await this.satelliteContract.read.findNodeOperatorsByAddress(
      [address, offset, limit, searchMode],
    );

    return result as NodeOperatorId[];
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getNodeOperatorsByAddress({
    address,
    offset = 0n,
    limit = 1000n,
  }: GetNodeOperatorsProps): Promise<NodeOperator[]> {
    const nodeOperators =
      await this.satelliteContract.read.getNodeOperatorsByAddress([
        address,
        offset,
        limit,
      ]);

    return nodeOperators.map((op) => ({
      id: op.id,
      roles: packRoles({
        [ROLES.MANAGER]: isAddressEqual(op.managerAddress, address),
        [ROLES.REWARDS]: isAddressEqual(op.rewardAddress, address),
      }),
    }));
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getNodeOperatorsByProposedAddress({
    address,
    offset = 0n,
    limit = 1000n,
  }: GetNodeOperatorsProps): Promise<NodeOperatorInvite[]> {
    const nodeOperators =
      await this.satelliteContract.read.getNodeOperatorsByProposedAddress([
        address,
        offset,
        limit,
      ]);

    return nodeOperators.reduce<NodeOperatorInvite[]>((invites, op) => {
      if (isAddressEqual(op.proposedManagerAddress, address)) {
        invites.push({
          id: op.id,
          role: ROLES.MANAGER,
        });
      }

      if (isAddressEqual(op.proposedRewardAddress, address)) {
        invites.push({
          id: op.id,
          role: ROLES.REWARDS,
        });
      }

      return invites;
    }, []);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getNodeOperatorsDepositableKeysCount({
    offset = 0n,
    limit = 1000n,
  }: GetDepositableKeysCountProps = {}): Promise<number[]> {
    const result =
      await this.satelliteContract.read.getNodeOperatorsDepositableValidatorsCount(
        [offset, limit],
      );

    return result.map((count) => Number(count));
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getQueueBatches({
    queuePriority,
    startIndex = 0n,
    limit = 1000n,
  }: GetQueueBatchesProps): Promise<bigint[]> {
    const result = await this.satelliteContract.read.getDepositQueueBatches([
      BigInt(queuePriority),
      startIndex,
      limit,
    ]);

    return result as bigint[];
  }
}
