import { GetContractReturnType, Hex, WalletClient } from 'viem';
import { CSStrikesAbi } from '../abi/index.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import { NodeOperatorId, Proof } from '../common/index.js';
import { fetchWithFallback } from '../common/utils/index.js';
import { fetchAddressesTree } from './fetch-proofs-tree.js';
import {
  filterLeafsByNodeOperator,
  findLeaf,
  findProof,
} from './find-proof.js';
import { onError } from './on-error.js';
import { KeyStrikes } from './types.js';

export class StrikesSDK extends CsmSDKModule {
  private get contract(): GetContractReturnType<
    typeof CSStrikesAbi,
    WalletClient
  > {
    return this.core.getContractCSStrikes();
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getTreeConfig() {
    const [root, cid] = await Promise.all([
      this.contract.read.treeRoot(),
      this.contract.read.treeCid(),
    ]).catch(onError);
    return { root, cid };
  }

  @Logger('Utils:')
  public getProofTreeUrls(cid: string): string[] {
    return [`https://ipfs.io/ipfs/${cid}`].filter((v) => v !== undefined);
  }

  @Logger('API:')
  @Cache(300 * 60 * 1000)
  public async getProofTree() {
    const { root, cid } = await this.getTreeConfig();

    if (!root || !cid) {
      return null;
    }

    const urls = this.getProofTreeUrls(cid);

    return fetchWithFallback(urls, (url) => fetchAddressesTree(url, root));
  }

  @Logger('Utils:')
  public async getProof(pubkey: Hex): Promise<Proof | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findProof(proofTree, pubkey);
  }

  @Logger('Utils:')
  public async getLeaf(pubkey: Hex): Promise<KeyStrikes | null> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return null;
    return findLeaf(proofTree, pubkey);
  }

  @Logger('Utils:')
  public async getLeafs(nodeOperatorId: NodeOperatorId): Promise<KeyStrikes[]> {
    const proofTree = await this.getProofTree();
    if (!proofTree) return [];
    return filterLeafsByNodeOperator(proofTree, nodeOperatorId);
  }
}
