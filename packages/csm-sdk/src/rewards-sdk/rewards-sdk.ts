import { stethSharesAbi } from '@lidofinance/lido-ethereum-sdk';
import { JSONParse } from 'json-with-bigint';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_LONG,
  CACHE_MID,
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
import {
  epochToTimestamp,
  ESTIMATED_BLOCK_GAP,
  slotToApproximateBlockNumber,
} from '../frame-sdk/utils.js';
import { KeysWithStatusSDK } from '../keys-with-status-sdk/keys-with-status-sdk.js';
import {
  KeyNumberValueInterval,
  ParametersSDK,
} from '../parameters-sdk/index.js';
import {
  convertEthToShares,
  convertSharesToEth,
} from './convert-shares-to-eth.js';
import { findOperatorRewards } from './find-operator-rewards.js';
import { findProofAndAmount } from './find-proof.js';
import { getOperatorCurveIdByBlock } from './get-operator-curve-id.js';
import { getValidatorFee } from './get-validator-fee.js';
import { getValidatorsRewards } from './get-validators-rewards.js';
import { isRewardsReportV2Array, parseReport } from './parse-report.js';
import { parseRewardsTree } from './parse-rewards-tree.js';
import {
  OperatorRewards,
  OperatorRewardsHistory,
  RewardsReport,
  StethPoolData,
} from './types.js';

export class RewardsSDK extends CsmSDKModule<{
  events: EventsSDK;
  parameters: ParametersSDK;
  frame: FrameSDK;
  keysWithStatus: KeysWithStatusSDK;
}> {
  private get distributorContract() {
    return this.core.contractCSFeeDistributor;
  }

  @Logger('Views:')
  @Cache(CACHE_MID)
  @ErrorHandler()
  public async getStethPoolData(blockNumber?: bigint): Promise<StethPoolData> {
    const contract = this.core.getContract(
      CSM_CONTRACT_NAMES.stETH,
      stethSharesAbi,
    );

    const [totalPooledEther, totalShares] = await Promise.all([
      contract.read.getTotalPooledEther({ blockNumber }),
      contract.read.getTotalShares({ blockNumber }),
    ]);

    return { totalPooledEther, totalShares };
  }

  @Logger('Views:')
  @ErrorHandler()
  /**
   * Converts stETH shares to ETH amount using the current pool ratio.
   * Also work for converting wstETH to stETH.
   */
  public async sharesToEth(amount: bigint, blockNumber?: bigint) {
    const poolData = await this.getStethPoolData(blockNumber);
    return convertSharesToEth(amount, poolData);
  }

  @Logger('Views:')
  @ErrorHandler()
  /**
   * Converts ETH amount to stETH shares using the current pool ratio.
   * Also work for converting stETH to wstETH.
   */
  public async ethToShares(amount: bigint, blockNumber?: bigint) {
    const poolData = await this.getStethPoolData(blockNumber);
    return convertEthToShares(amount, poolData);
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

    return fetchTree({
      urls,
      root,
      parse: (data) => parseRewardsTree(JSONParse(data)),
    });
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
    return fetchOneOf<RewardsReport>({
      urls,
      parse: (data) => parseReport(JSONParse(data)),
    });
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastReport() {
    const logCid = await this.getLastReportCid();
    const report = await this.getReportByCid(logCid);

    if (report && isRewardsReportV2Array(report)) return report.at(-1);
    return report;
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

    const blockNumber = BigInt(report.blockstamp.block_number);
    const distributed = await this.sharesToEth(shares, blockNumber);

    return { ...rest, distributed };
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

  @Logger('Utils:')
  @ErrorHandler()
  public async getAllReports() {
    const logs = await this.bus.events.getDistributionLogUpdated();

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
    const [
      reports,
      keys,
      frameConfig,
      curveIdChanges,
      rewardsConfigsMap,
      defaultCurveId,
    ] = await Promise.all([
      this.getAllReports(),
      this.bus.keysWithStatus.getClKeysStatus(nodeOperatorId),
      this.bus.frame.getConfig(),
      this.bus.events.getOperatorCurveIdChanges(nodeOperatorId),
      this.getRewardsConfigsMap(),
      this.bus.parameters.getDefaultCurveId(),
    ]);

    if (reports.length === 0) return [];

    const validatorsRewards = reports.flatMap((report) =>
      getValidatorsRewards(nodeOperatorId, report),
    );

    const uniqueBlocks = [
      ...new Set(validatorsRewards.map((r) => r.blockNumber)),
    ];
    const poolDataByBlock = new Map(
      await Promise.all(
        uniqueBlocks.map(
          async (blockNumber) =>
            [blockNumber, await this.getStethPoolData(blockNumber)] as const,
        ),
      ),
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
      const pubkey = keys?.find(
        (k) => k.validatorIndex === vr.validatorIndex,
      )?.pubkey;

      const poolData = poolDataByBlock.get(vr.blockNumber) as StethPoolData;

      return {
        ...vr,
        fee,
        curveId,
        pubkey,
        startTimestamp: epochToTimestamp(vr.frame[0], frameConfig),
        endTimestamp: epochToTimestamp(vr.frame[1], frameConfig),
        receivedRewards: convertSharesToEth(vr.receivedShares, poolData),
      };
    });

    return enhancedRewards.sort(sortRewardsByRefSlot);
  }

  @Logger('Utils:')
  @Cache(CACHE_MID)
  @ErrorHandler()
  public async getRewardsConfigsMap(): Promise<
    Map<bigint, KeyNumberValueInterval[]>
  > {
    const curvesCount = await this.bus.parameters.getCurvesCount();

    // FIXME: remove cast to number
    const configs = await Promise.all(
      // curveId is zero-based
      Array.from({ length: Number(curvesCount) }, async (_, _curveId) => {
        const curveId = BigInt(_curveId);
        const rewardsConfig =
          await this.bus.parameters.getRewardsShare(curveId);

        return [curveId, rewardsConfig] as const;
      }),
    );

    return new Map(configs);
  }
}
