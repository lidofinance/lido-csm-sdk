import {
  AccountingSDK,
  convertSharesToEth,
  StethPoolData,
} from '../accounting-sdk/index.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CACHE_MID,
  NodeOperatorId,
  PERCENT_BASIS,
  RewardProof,
} from '../common/index.js';
import {
  bigIntRange,
  fetchOneOf,
  fetchTree,
  isDefined,
  isUnique,
  sortRewardsByRefSlot,
} from '../common/utils/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { FrameSDK } from '../frame-sdk/frame-sdk.js';
import {
  epochToTimestamp,
  ESTIMATED_BLOCK_GAP,
  slotToApproximateBlockNumber,
} from '../frame-sdk/utils.js';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk.js';
import { ModuleSDK } from '../module-sdk/module-sdk.js';
import { ParametersSDK } from '../parameters-sdk/index.js';
import { REPORT_V1_LOG_CIDS } from './consts.js';
import { findOperatorRewards } from './find-operator-rewards.js';
import { findProofAndAmount } from './find-proof.js';
import { getValidatorsRewards } from './get-validators-rewards.js';
import { parseReport } from './parse-report.js';
import { parseRewardsTree } from './parse-rewards-tree.js';
import {
  OperatorRewards,
  OperatorRewardsHistory,
  RewardsReport,
} from './types.js';

export class RewardsSDK extends CsmSDKModule<{
  accounting: AccountingSDK;
  events: EventsSDK;
  parameters: ParametersSDK;
  frame: FrameSDK;
  keysWithStatus: KeysWithStatusSDK;
  module: ModuleSDK;
}> {
  private get distributorContract() {
    return this.core.contractCSFeeDistributor;
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [...this.core.getIpfsUrls(cid), this.core.rewardsTreeLink].filter(
      isDefined,
    );
  }

  @Logger('Utils:')
  public getReportUrls(cid: string): string[] {
    return this.core.getIpfsUrls(cid).filter(isDefined);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  private async getHistoryCount() {
    return this.distributorContract.read.distributionDataHistoryCount();
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_LONG)
  public async getReportConfig(number: bigint) {
    return this.distributorContract.read.getHistoricalDistributionData([
      number,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getLastReportConfig() {
    const historyCount = await this.getHistoryCount();
    if (!historyCount) return null;

    return this.getReportConfig(historyCount - 1n);
  }

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const config = await this.getLastReportConfig();
    if (!config) return null;

    const urls = this.getProofTreeUrls(config.treeCid);

    return fetchTree({ urls, root: config.treeRoot, parse: parseRewardsTree });
  }

  @Logger('Utils:')
  public async getProof(nodeOperatorId: NodeOperatorId) {
    const proofTree = await this.getProofTree();

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
    return await this.bus.accounting.sharesToEth(available);
  }

  @Logger('Utils:')
  public async getRewards(nodeOperatorId: NodeOperatorId) {
    const proof = await this.getProof(nodeOperatorId);
    const available = await this.getAvailable(nodeOperatorId, proof);

    return {
      ...proof,
      available,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getReportByCid(cid: string) {
    const urls = this.getReportUrls(cid);

    return fetchOneOf<RewardsReport>({
      urls,
      parse: parseReport,
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastReport() {
    const config = await this.getLastReportConfig();
    if (!config) return;

    const report = await this.getReportByCid(config?.logCid);

    return Array.isArray(report) ? report.at(-1) : report;
  }

  @Logger('Utils:')
  public async getOperatorRewardsInLastReport(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorRewards | undefined> {
    const report = await this.getLastReport();
    if (!report) return undefined;

    const { shares, ...rest } = findOperatorRewards(nodeOperatorId, report);

    const distributed = await this.bus.accounting.sharesToEth(
      shares,
      report.blockstamp.block_number,
    );

    return { ...rest, shares, distributed };
  }

  @Logger('Utils:')
  public async getLastReportTransactionHash() {
    const [config, lastRefSlot, currentBlock] = await Promise.all([
      this.bus.frame.getConfig(),
      this.bus.frame.getLastProcessedRefSlot(),
      this.bus.frame.getLatestBlock(),
    ]);

    const estimatedBlock = slotToApproximateBlockNumber(
      lastRefSlot,
      config,
      currentBlock,
    );
    const fromBlock = estimatedBlock - ESTIMATED_BLOCK_GAP;

    const logs = await this.bus.events.getRewardsReports({ fromBlock });
    const lastLog = logs.at(-1);

    return lastLog?.transactionHash;
  }

  public async getAllReports() {
    const reportsCount = await this.getHistoryCount();

    const oldReportLogCids = REPORT_V1_LOG_CIDS[this.core.chainId];

    const reports = await Promise.all([
      ...oldReportLogCids.map((cid) => this.getReportByCid(cid)),
      ...[...bigIntRange(reportsCount)].map(async (index) => {
        const { logCid } = await this.getReportConfig(index);
        return this.getReportByCid(logCid);
      }),
    ]);

    return reports.flat().filter(isDefined);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getOperatorRewardsHistory(
    nodeOperatorId: NodeOperatorId,
  ): Promise<OperatorRewardsHistory> {
    const [reports, keys, frameConfig, digest] = await Promise.all([
      this.getAllReports(),
      this.bus.keysWithStatus.getClKeysStatus(nodeOperatorId),
      this.bus.frame.getConfig(),
      this.bus.module.getDigest(),
    ]);

    if (reports.length === 0) return [];

    const validatorsRewards = reports.flatMap((report) =>
      getValidatorsRewards(nodeOperatorId, report),
    );

    const poolDataByBlock =
      await this.bus.accounting.getStethPoolDataByBlockNumbers(
        validatorsRewards.map((r) => r.blockNumber).filter(isUnique),
      );

    const enhancedRewards = validatorsRewards.map((vr) => {
      const fee =
        (BigInt(Number(PERCENT_BASIS) * vr.rewardShare) *
          digest.state.stakingModuleFee) /
        PERCENT_BASIS;

      const pubkey = keys?.find(
        (k) => k.validatorIndex === vr.validatorIndex,
      )?.pubkey;

      const poolData = poolDataByBlock.get(vr.blockNumber) as StethPoolData;

      return {
        ...vr,
        fee,
        pubkey,
        startTimestamp: epochToTimestamp(vr.frame[0], frameConfig),
        endTimestamp: epochToTimestamp(vr.frame[1], frameConfig),
        receivedRewards: convertSharesToEth(vr.receivedShares, poolData),
      };
    });

    return enhancedRewards.sort(sortRewardsByRefSlot);
  }
}
