import { Address, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { CONTRACT_NAMES, OPERATOR_TYPE } from '../common/constants/index';
import { ROLES } from '../common/constants/roles';
import { Dedupe, ErrorHandler, Logger } from '../common/decorators/index';
import {
  NodeOperatorId,
  NodeOperatorInviteInfo,
  NodeOperatorShortInfo,
} from '../common/types';
import {
  getCurveRefByOperatorType,
  getOperatorTypesForModule,
} from '../common/utils/operator-type-utils';
import { invariantArgument } from '../common/utils/sdk-error';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { byTotalCount, iteratePages, onePage } from './iterate-pages';
import { toDiscoveryInfo, toShortInfo } from './map-operators';
import {
  NodeOperatorDiscoveryInfo,
  NodeOperatorLockedBond,
  Pagination,
  SearchMode,
} from './types';

const MAX_PAGE_LIMIT = 1000n;

export class DiscoverySDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private get discoveryContract() {
    return this.core.getContract(CONTRACT_NAMES.smDiscovery);
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
   * @param defaultLimit - Optional default limit when pagination is not provided (defaults to 1000)
   * @returns Array of all fetched operators
   */
  private async paginateOperators<T>(
    fetchPage: (p: Pagination) => Promise<readonly T[] | T[]>,
    pagination?: Pagination,
    defaultLimit = MAX_PAGE_LIMIT,
  ): Promise<T[]> {
    const limit = pagination?.limit ?? defaultLimit;
    invariantArgument(
      limit >= 1n && limit <= MAX_PAGE_LIMIT,
      `Pagination limit must be between 1 and ${MAX_PAGE_LIMIT}`,
    );
    const offset = pagination?.offset ?? 0n;

    const getNextOffset = pagination
      ? onePage
      : byTotalCount(await this.bus.module.getOperatorsCount());

    return iteratePages(fetchPage, { offset, limit }, getNextOffset);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getNodeOperatorIds(
    address: Address,
    searchMode: SearchMode = SearchMode.CURRENT_ADDRESSES,
    pagination?: Pagination,
  ): Promise<NodeOperatorId[]> {
    return this.paginateOperators(
      (p) =>
        this.discoveryContract.read.findNodeOperatorsByAddress([
          this.core.moduleId,
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
  @Dedupe()
  public async getNodeOperatorsByAddress(
    address: Address,
    pagination?: Pagination,
  ): Promise<NodeOperatorShortInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getNodeOperatorsByAddress([
          this.core.moduleId,
          address,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    return operators.map(toShortInfo);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorsByCurveId(
    curveId: bigint,
    pagination?: Pagination,
  ): Promise<NodeOperatorShortInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getOperatorsByCurveId([
          this.core.moduleId,
          curveId,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    return operators.map(toShortInfo);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorsByType(
    operatorType: OPERATOR_TYPE,
    pagination?: Pagination,
  ): Promise<NodeOperatorShortInfo[]> {
    const ref = getCurveRefByOperatorType(this.core.chainId, operatorType);
    invariantArgument(
      ref?.module === this.core.moduleName,
      `Operator type "${operatorType}" is not available for module ${this.core.moduleName} on the current chain`,
    );

    return this.getOperatorsByCurveId(ref.curveId, pagination);
  }

  @Logger('Views:')
  public getAvailableOperatorTypes(): OPERATOR_TYPE[] {
    return getOperatorTypesForModule(this.core.chainId, this.core.moduleName);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getNodeOperatorsByProposedAddress(
    address: Address,
    pagination?: Pagination,
  ): Promise<NodeOperatorInviteInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getNodeOperatorsByProposedAddress([
          this.core.moduleId,
          address,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    return operators.flatMap((operator) =>
      [
        { address: operator.proposedManagerAddress, role: ROLES.MANAGER },
        { address: operator.proposedRewardAddress, role: ROLES.REWARDS },
      ]
        .filter((item) => isAddressEqual(item.address, address))
        .map((item) => ({
          nodeOperatorId: operator.id,
          extendedManagerPermissions: operator.extendedManagerPermissions,
          curveId: operator.curveId,
          role: item.role,
        })),
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getAllNodeOperators(
    pagination?: Pagination,
  ): Promise<NodeOperatorDiscoveryInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getAllNodeOperators([
          this.core.moduleId,
          p.offset,
          p.limit,
        ]),
      pagination,
      500n, // Custom default limit for bulk fetching
    );

    return operators.map(toDiscoveryInfo);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Dedupe()
  public async getOperatorsWithLockedBond(
    pagination?: Pagination,
  ): Promise<NodeOperatorLockedBond[]> {
    const entries = await this.paginateOperators(
      (p) =>
        this.discoveryContract.read.getOperatorsWithLockedBond([
          this.core.moduleId,
          p.offset,
          p.limit,
        ]),
      pagination,
    );

    return entries.map((e) => ({
      nodeOperatorId: e.id,
      locked: e.amount,
      until: Number(e.until),
    }));
  }
}
