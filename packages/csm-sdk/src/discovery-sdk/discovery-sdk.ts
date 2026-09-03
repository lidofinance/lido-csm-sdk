import {
  Address,
  ContractFunctionArgs,
  isAddressEqual,
  ReadContractReturnType,
  zeroAddress,
} from 'viem';
import { SMDiscoveryAbi } from '../abi/SMDiscovery';
import { SMDiscoveryV1Abi } from '../abi/SMDiscoveryV1';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { CONTRACT_NAMES, OPERATOR_TYPE } from '../common/constants/index';
import { ROLES } from '../common/constants/roles';
import { ErrorHandler, Logger } from '../common/decorators/index';
import {
  NodeOperatorId,
  NodeOperatorInviteInfo,
  NodeOperatorShortInfo,
} from '../common/types';
import {
  getCurveRefByOperatorType,
  getOperatorTypesForModule,
} from '../common/utils/operator-type-utils';
import { onRevertEmptyList } from '../common/utils/on-error';
import {
  invariant,
  invariantArgument,
  ERROR_CODE,
} from '../common/utils/sdk-error';
import { ModuleSDK } from '../module-sdk/module-sdk';
import { byTotalCount, iteratePages, onePage } from './iterate-pages';
import {
  isEnumConversionPanic,
  isLegacyDecodeError,
  UPGRADE_REQUIRED_MESSAGE,
  requiresUpgradedImpl,
  VersionedRead,
} from './legacy-impl';
import { toDiscoveryInfo, toShortInfo } from './map-operators';
import {
  NodeOperatorDiscoveryInfo,
  NodeOperatorLockedBond,
  Pagination,
  SearchMode,
} from './types';

export class DiscoverySDK extends CsmSDKModule<{ module: ModuleSDK }> {
  private isLegacy = false;

  private get discoveryContract() {
    return this.core.getContract(CONTRACT_NAMES.smDiscovery);
  }

  private get discoveryContractV1() {
    return this.core.getContractWithAbi(
      CONTRACT_NAMES.smDiscovery,
      SMDiscoveryV1Abi,
    );
  }

  private assertSearchModeSupported(mode: SearchMode) {
    invariant(
      !requiresUpgradedImpl(mode) || !this.isLegacy,
      UPGRADE_REQUIRED_MESSAGE,
      ERROR_CODE.NOT_SUPPORTED,
    );
  }

  // Empty arrays decode identically under both ABIs, so a modern success never
  // proves the new impl; only a decode failure followed by a legacy success does.
  private async readVersioned<N extends VersionedRead>(
    functionName: N,
    args: ContractFunctionArgs<typeof SMDiscoveryV1Abi, 'view', N>,
  ): Promise<ReadContractReturnType<typeof SMDiscoveryAbi, N>> {
    type Result = ReadContractReturnType<typeof SMDiscoveryAbi, N>;
    type Reads<R> = Record<
      VersionedRead,
      (
        args: ContractFunctionArgs<typeof SMDiscoveryV1Abi, 'view', N>,
      ) => Promise<R>
    >;

    const readLegacy = async () => {
      const rows = await (
        this.discoveryContractV1.read as Reads<readonly object[]>
      )[functionName](args);
      return rows.map((row) => ({
        claimerAddress: zeroAddress,
        ...row,
      })) as unknown as Result;
    };

    if (this.isLegacy) return readLegacy();

    try {
      return await (this.discoveryContract.read as unknown as Reads<Result>)[
        functionName
      ](args);
    } catch (modernError) {
      if (!isLegacyDecodeError(modernError)) throw modernError;

      try {
        const result = await readLegacy();
        this.isLegacy = true;
        return result;
      } catch {
        throw modernError;
      }
    }
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
    defaultLimit = 1000n,
  ): Promise<T[]> {
    const limit = pagination?.limit ?? defaultLimit;
    const offset = pagination?.offset ?? 0n;

    const getNextOffset = pagination
      ? onePage
      : byTotalCount(await this.bus.module.getOperatorsCount());

    return iteratePages(fetchPage, { offset, limit }, getNextOffset).catch(
      onRevertEmptyList<T>,
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatorIds(
    address: Address,
    searchMode: SearchMode = SearchMode.CURRENT_ADDRESSES,
    pagination?: Pagination,
  ): Promise<NodeOperatorId[]> {
    this.assertSearchModeSupported(searchMode);

    return this.paginateOperators(
      (p) =>
        this.discoveryContract.read
          .findNodeOperatorsByAddress([
            this.core.moduleId,
            address,
            p.offset,
            p.limit,
            searchMode,
          ])
          .catch((error) => {
            if (
              requiresUpgradedImpl(searchMode) &&
              isEnumConversionPanic(error)
            ) {
              this.isLegacy = true;
            }
            this.assertSearchModeSupported(searchMode);
            throw error;
          }),
      pagination,
    );
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getNodeOperatorsByAddress(
    address: Address,
    pagination?: Pagination,
  ): Promise<NodeOperatorShortInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.readVersioned('getNodeOperatorsByAddress', [
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
  public async getOperatorsByCurveId(
    curveId: bigint,
    pagination?: Pagination,
  ): Promise<NodeOperatorShortInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.readVersioned('getOperatorsByCurveId', [
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
  public async getAllNodeOperators(
    pagination?: Pagination,
  ): Promise<NodeOperatorDiscoveryInfo[]> {
    const operators = await this.paginateOperators(
      (p) =>
        this.readVersioned('getAllNodeOperators', [
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
