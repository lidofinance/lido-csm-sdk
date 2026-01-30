import { Address, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ROLES } from '../common/constants/roles.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  NodeOperator,
  NodeOperatorId,
  NodeOperatorInvite,
} from '../common/types.js';
import { byTotalCount, iteratePages, onePage } from './iterate-pages.js';
import { packRoles } from '../events-sdk/merge.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { SearchMode, Pagination } from './types.js';

export class DiscoverySDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private get discoveryContract() {
    return this.core.contractSMDiscovery;
  }

  /**
   * Paginates through operators using the provided fetch function.
   *
   * Behavior:
   * - Without pagination parameter: Fetches ALL operators by querying total count and iterating through all pages
   * - With pagination parameter: Fetches ONLY ONE PAGE at the specified offset/limit
   *
   * @param fetchPage - Function to fetch a page of operators
   * @param pagination - Optional pagination parameters (offset, limit)
   * @returns Array of all fetched operators
   */
  private async paginateOperators<T>(
    fetchPage: (p: Pagination) => Promise<readonly T[] | T[]>,
    pagination?: Pagination,
  ): Promise<T[]> {
    const getNextOffset = pagination
      ? onePage
      : byTotalCount(await this.bus.module.getOperatorsCount());

    return iteratePages(fetchPage, pagination, getNextOffset);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatorIds(
    address: Address,
    searchMode: SearchMode = SearchMode.CURRENT_ADDRESSES,
    pagination?: Pagination,
  ): Promise<NodeOperatorId[]> {
    return this.paginateOperators(
      (p) =>
        this.discoveryContract.read.findNodeOperatorsByAddress([
          BigInt(this.core.moduleId),
          address,
          p.offset,
          p.limit,
          searchMode,
        ]),
      pagination,
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatorsByAddress(
    address: Address,
    pagination?: Pagination,
  ): Promise<NodeOperator[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getNodeOperatorsByAddress([
          BigInt(this.core.moduleId),
          address,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    // FIXME: return extendedMode and curveId
    return operators.map((operator) => ({
      id: operator.id,
      roles: packRoles({
        [ROLES.MANAGER]: isAddressEqual(operator.managerAddress, address),
        [ROLES.REWARDS]: isAddressEqual(operator.rewardAddress, address),
      }),
    }));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatorsByProposedAddress(
    address: Address,
    pagination?: Pagination,
  ): Promise<NodeOperatorInvite[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getNodeOperatorsByProposedAddress([
          BigInt(this.core.moduleId),
          address,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    // FIXME: return extendedMode and curveId
    return operators.flatMap((operator) =>
      [
        { address: operator.proposedManagerAddress, role: ROLES.MANAGER },
        { address: operator.proposedRewardAddress, role: ROLES.REWARDS },
      ]
        .filter((item) => isAddressEqual(item.address, address))
        .map((item) => ({ id: operator.id, role: item.role })),
    );
  }
}
