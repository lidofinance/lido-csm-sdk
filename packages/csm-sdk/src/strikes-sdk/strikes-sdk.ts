import { JSONParse } from 'json-with-bigint';
import { Hex } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { CACHE_LONG, NodeOperatorId, Proof } from '../common/index.js';
import { fetchTree, isDefined, onError } from '../common/utils/index.js';
import {
  filterLeafsByNodeOperator,
  findLeaf,
  findProof,
} from './find-proof.js';
import { parseStrikesTree } from './parse-tree.js';
import { KeyWithStrikes, StrikesTreeLeaf } from './types.js';

export class StrikesSDK extends CsmSDKModule {
  private get strikesContract() {
    return this.core.contractCSStrikes;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.strikesContract.read.treeRoot(),
      this.strikesContract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    // TODO: fallback
    return this.core.getIpfsUrls(cid).filter(isDefined);
  }

  @Logger('API:')
  @Cache(CACHE_LONG)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchTree<StrikesTreeLeaf>({
      urls,
      root,
      parse: (data) => parseStrikesTree(JSONParse(data)),
    });
  }

  @Logger('Utils:')
  public async getProof(pubkey: Hex): Promise<Proof | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findProof(proofTree, pubkey);
  }

  @Logger('Utils:')
  public async getStrikes(pubkey: Hex): Promise<KeyWithStrikes | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findLeaf(proofTree, pubkey);
  }

  @Logger('Utils:')
  public async getKeysWithStrikes(
    nodeOperatorId: NodeOperatorId,
  ): Promise<KeyWithStrikes[]> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return [];
    return filterLeafsByNodeOperator(proofTree, nodeOperatorId);
  }
}
