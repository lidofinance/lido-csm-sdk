import { stethSharesAbi } from '@lidofinance/lido-ethereum-sdk';
import { GetContractReturnType, WalletClient } from 'viem';
import { CSFeeDistributorAbi } from '../abi/CSFeeDistributor.js';
import { CSFeeOracleAbi } from '../abi/CSFeeOracle.js';
import { HashConsensusAbi } from '../abi/HashConsensus.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_NAMES,
  EXTERNAL_LINKS,
  LINK_TYPE,
  NodeOperatorId,
  RewardProof,
} from '../common/index.js';
import { fetchJson, fetchWithFallback } from '../common/utils/fetch-json.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { SpendingSDK } from '../spending-sdk/spending-sdk.js';
import { fetchRewardsTree } from './fetch-rewards-tree.js';
import { findOperatorRewards } from './find-operator-rewards.js';
import { EMPTY_PROOF, findProofAndAmount } from './find-proof.js';
import { OperatorRewards, RewardsReport } from './types.js';
import { onError } from './on-error.js';

export class RewardsSDK extends CsmSDKModule<{
  spending: SpendingSDK;
  events: EventsSDK;
}> {
  private get distributorContract(): GetContractReturnType<
    typeof CSFeeDistributorAbi,
    WalletClient
  > {
    return this.core.getContractCSFeeDistributor();
  }

  private get oracleContract(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.core.getContractCSFeeOracle();
  }

  private get consensusContract(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.core.getContractHashConsensus();
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [
      EXTERNAL_LINKS[this.core.chainId]?.[LINK_TYPE.rewardsTree],
      `https://ipfs.io/ipfs/${cid}`,
    ].filter((v) => v !== undefined);
  }

  @Logger('Utils:')
  public getLogUrls(cid: string): string[] {
    return [`https://ipfs.io/ipfs/${cid}`].filter((v) => v !== undefined);
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
  @Cache(300 * 60 * 1000)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchWithFallback(urls, (url) => fetchRewardsTree(url, root));
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
  public async sharesToEth(amount: bigint) {
    const contract = this.core.getContract(
      CSM_CONTRACT_NAMES.stETH,
      stethSharesAbi,
    );

    return contract.read.getPooledEthByShares([amount]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastFrame() {
    const [
      [slotsPerEpoch, secondsPerSlot, genesisTime],
      [, epochsPerFrame],
      lastRefSlot,
    ] = await Promise.all([
      this.consensusContract.read.getChainConfig(),
      this.consensusContract.read.getFrameConfig(),
      this.oracleContract.read.getLastProcessingRefSlot(),
    ]);

    const lastDistribution = lastRefSlot * secondsPerSlot + genesisTime;

    const frameDuration = epochsPerFrame * slotsPerEpoch * secondsPerSlot;

    return {
      lastDistribution: Number(lastDistribution),
      nextDistribution: Number(lastDistribution + frameDuration),
      prevDistribution: Number(lastDistribution - frameDuration),
      frameDuration: frameDuration,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getLastReport() {
    const logCid = await this.distributorContract.read.logCid();
    const urls = this.getLogUrls(logCid);

    return fetchWithFallback(urls, (url) => fetchJson<RewardsReport>(url));
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
    const logs = await this.bus.getOrThrow('events').getRewardsReports();
    const lastLog = logs.at(-1);

    return lastLog?.transactionHash;
  }
}
