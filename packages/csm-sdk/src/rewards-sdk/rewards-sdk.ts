import { stethSharesAbi } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CSM_CONTRACT_NAMES,
  NodeOperatorId,
  RewardProof,
} from '../common/index.js';
import {
  fetchOneOf,
  fetchTree,
  isDefined,
  onError,
  sortRewardsByRefSlot,
} from '../common/utils/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { FrameSDK } from '../frame-sdk/frame-sdk.js';
import { epochToTimestamp } from '../frame-sdk/utils.js';
import {
  KeyNumberValueInterval,
  ParametersSDK,
} from '../parameters-sdk/index.js';
import { convertSharesToEth } from './convert-shares-to-eth.js';
import { findOperatorRewards } from './find-operator-rewards.js';
import { EMPTY_PROOF, findProofAndAmount } from './find-proof.js';
import { getValidatorsRewards } from './get-validators-rewards.js';
import { getValidatorFee } from './get-validator-fee.js';
import { parseRewardsTree } from './parse-rewards-tree.js';
import {
  OperatorRewards,
  OperatorRewardsHistory,
  RewardsReport,
  RewardsTreeLeaf,
  StethPoolData,
} from './types.js';
import { getOperatorCurveIdByBlock } from './get-operator-curve-id.js';

export class RewardsSDK extends CsmSDKModule {
  private declare events: EventsSDK;
  private declare frame: FrameSDK;
  private declare parameters: ParametersSDK;

  private get distributorContract() {
    return this.core.contractCSFeeDistributor;
  }

  @Logger('Views:')
  @Cache(30 * 60 * 1000)
  @ErrorHandler()
  public async getStethPoolData(): Promise<StethPoolData> {
    const contract = this.core.getContract(
      CSM_CONTRACT_NAMES.stETH,
      stethSharesAbi,
    );

    const [totalPooledEther, totalShares] = await Promise.all([
      contract.read.getTotalPooledEther(),
      contract.read.getTotalShares(),
    ]);

    return { totalPooledEther, totalShares };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async sharesToEth(amount: bigint) {
    const poolData = await this.getStethPoolData();
    return convertSharesToEth(amount, poolData);
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [...this.core.getIpfsUrls(cid), this.core.rewardsTreeLink].filter(
      isDefined,
    );
  }

  @Logger('Utils:')
  public getReportUrls(cid: string): string[] {
    // TODO: fallback
    return this.core.getIpfsUrls(cid).filter(isDefined);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.distributorContract.read.treeRoot(),
      this.distributorContract.read.treeCid(),
    ]).catch(onError);

    return { root, cid };
  }

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchTree<RewardsTreeLeaf>({
      urls,
      root,
      parse: parseRewardsTree,
    });
  }

  @Logger('Utils:')
  public async getProof(nodeOperatorId: NodeOperatorId) {
    const proofTree = await this.getProofTree();
    if (!proofTree) return EMPTY_PROOF;
    return findProofAndAmount(proofTree, nodeOperatorId);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getAvailable(
    nodeOperatorId: NodeOperatorId,
    { proof, shares }: RewardProof,
  ) {
    if (proof.length === 0) return 0n;

    const available = await this.distributorContract.read.getFeesToDistribute([
      nodeOperatorId,
      shares,
      proof,
    ]);
    return await this.sharesToEth(available);
  }

  @Logger('Utils:')
  public async getRewards(nodeOperatorId: NodeOperatorId) {
    const proofs = await this.getProof(nodeOperatorId);

    const available = await this.getAvailable(nodeOperatorId, proofs);

    return {
      ...proofs,
      available,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastReportCid() {
    return this.distributorContract.read.logCid();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getReportByCid(cid: string) {
    const urls = this.getReportUrls(cid);
    return fetchOneOf<RewardsReport>({ urls });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastReport() {
    const logCid = await this.getLastReportCid();
    return this.getReportByCid(logCid);
  }

  @Logger('Utils:')
  public async getOperatorRewardsInLastReport(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorRewards | undefined> {
    const report = await this.getLastReport();
    if (!report) return undefined;

    const { distributed: shares, ...rest } = findOperatorRewards(
      nodeOperatorId,
      report,
    );

    const distributed = await this.sharesToEth(shares);

    return { ...rest, distributed };
  }

  @Logger('Utils:')
  public async getLastReportTransactionHash() {
    // TODO: get events block range by ref-slot
    const logs = await this.events.getRewardsReports();
    const lastLog = logs.at(-1);

    return lastLog?.transactionHash;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getAllReports() {
    const logs = await this.events.getDistributionLogUpdated();

    const cids = logs.map((log) => log.args.logCid).filter(isDefined);

    const reports = await Promise.all(
      cids.map((cid) => this.getReportByCid(cid)),
    );

    return reports.filter(isDefined);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorRewardsHistory(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorRewardsHistory> {
    // Fetch all data in parallel for better performance
    const [
      reports,
      frameConfig,
      curveIdChanges,
      rewardsConfigsMap,
      defaultCurveId,
      poolData, // Used to convert shares to ETH in a single call (current ratio vs block-specific rates)
    ] = await Promise.all([
      this.getAllReports(),
      this.frame.getConfig(),
      this.events.getOperatorCurveIdChanges(nodeOperatorId),
      this.getRewardsConfigsMap(),
      this.parameters.getDefaultCurveId(),
      this.getStethPoolData(),
    ]);

    if (reports.length === 0) return [];

    const validatorsRewards = reports.flatMap((report) =>
      getValidatorsRewards(nodeOperatorId, report),
    );

    const enhancedRewards = validatorsRewards.map((vr) => {
      const curveId = getOperatorCurveIdByBlock(
        vr.blockNumber,
        curveIdChanges,
        defaultCurveId,
      );
      const fee = getValidatorFee(
        vr.indexInReport + 1,
        curveId,
        rewardsConfigsMap,
      );

      return {
        ...vr,
        fee,
        curveId,
        startTimestamp: epochToTimestamp(vr.frame[0], frameConfig),
        endTimestamp: epochToTimestamp(vr.frame[1], frameConfig),
        receivedRewards: convertSharesToEth(vr.receivedShares, poolData),
      };
    });

    return enhancedRewards.sort(sortRewardsByRefSlot);
  }

  @Logger('Utils:')
  @Cache(30 * 60 * 1000)
  @ErrorHandler()
  public async getRewardsConfigsMap(): Promise<
    Map<bigint, KeyNumberValueInterval[]>
  > {
    const curvesCount = await this.parameters.getCurvesCount();

    // FIXME: remove cast to number
    const configs = await Promise.all(
      // curveId is zero-based
      Array.from({ length: Number(curvesCount) }, async (_, _curveId) => {
        const curveId = BigInt(_curveId);
        const rewardsConfig = await this.parameters.getRewardsShare(curveId);

        return [curveId, rewardsConfig] as const;
      }),
    );

    return new Map(configs);
  }
}
