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
  public async getNodeOperatorIds(
    props: FindOperatorIdsProps,
  ): Promise<NodeOperatorId[]> {
    const {
      address,
      offset = 0n,
      limit = 1000n,
      searchMode = SearchMode.CURRENT_ADDRESSES,
    } = props;

    const result = await this.satelliteContract.read.findNodeOperatorsByAddress(
      [address, offset, limit, searchMode],
    );

    return result as NodeOperatorId[];
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getQueueBatches(props: GetQueueBatchesProps): Promise<bigint[]> {
    const { queuePriority, startIndex = 0n, limit = 1000n } = props;

    const result = await this.satelliteContract.read.getDepositQueueBatches([
      queuePriority,
      startIndex,
      limit,
    ]);

    return result as bigint[];
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(10 * 1000)
  public async getNodeOperatorsByAddress(
    props: GetNodeOperatorsProps,
  ): Promise<NodeOperator[]> {
    const { address, offset = 0n, limit = 1000n } = props;

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
  public async getNodeOperatorsByProposedAddress(
    props: GetNodeOperatorsProps,
  ): Promise<NodeOperatorInvite[]> {
    const { address, offset = 0n, limit = 1000n } = props;

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
}
