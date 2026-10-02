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
import {
  assertPageLimit,
  MAX_PAGE_LIMIT,
  readAllPages,
} from '../common/utils/read-all-pages';
import { invariantArgument } from '../common/utils/sdk-error';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { toDiscoveryInfo, toShortInfo } from './map-operators';
import {
  NodeOperatorDiscoveryInfo,
  NodeOperatorLockedBond,
  Pagination,
  SearchMode,
} from './types';

const pinnedAt = ({ blockNumber }: { blockNumber?: bigint }) =>
  blockNumber === undefined ? undefined : { blockNumber };

type PageFetcher<T> = (
  p: Pagination & { blockNumber?: bigint },
) => Promise<readonly T[] | T[]>;

export class DiscoverySDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private get discoveryContract() {
    return this.core.getContract(CONTRACT_NAMES.smDiscovery);
  }

  /**
   * Without `pagination`: reads ALL operators page by page at one pinned block.
   * With `pagination`: reads ONLY that page, unpinned.
   */
  private async paginateOperators<T>(
    fetchPage: PageFetcher<T>,
    pagination?: Pagination,
    defaultLimit = MAX_PAGE_LIMIT,
  ): Promise<T[]> {
    if (pagination) {
      assertPageLimit(pagination.limit);
      return [...(await fetchPage(pagination))];
    }

    return readAllPages({
      publicClient: this.core.publicClient,
      limit: defaultLimit,
      count: (blockNumber) =>
        this.bus.module.getOperatorsCount({ blockNumber }),
      readPage: async (p) => ({ items: await fetchPage(p) }),
    });
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
        this.discoveryContract.read.findNodeOperatorsByAddress(
          [this.core.moduleId, address, p.offset, p.limit, searchMode],
          pinnedAt(p),
        ),
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
        this.discoveryContract.read.getNodeOperatorsByAddress(
          [this.core.moduleId, address, p.offset, p.limit],
          pinnedAt(p),
        ),
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
        this.discoveryContract.read.getOperatorsByCurveId(
          [this.core.moduleId, curveId, p.offset, p.limit],
          pinnedAt(p),
        ),
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
        this.discoveryContract.read.getNodeOperatorsByProposedAddress(
          [this.core.moduleId, address, p.offset, p.limit],
          pinnedAt(p),
        ),
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
        this.discoveryContract.read.getAllNodeOperators(
          [this.core.moduleId, p.offset, p.limit],
          pinnedAt(p),
        ),
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
        this.discoveryContract.read.getOperatorsWithLockedBond(
          [this.core.moduleId, p.offset, p.limit],
          pinnedAt(p),
        ),
      pagination,
    );

    return entries.map((e) => ({
      nodeOperatorId: e.id,
      locked: e.amount,
      until: Number(e.until),
    }));
  }
}
