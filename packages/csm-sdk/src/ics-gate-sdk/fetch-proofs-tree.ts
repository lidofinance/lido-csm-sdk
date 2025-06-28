import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { AddressesTree } from './types.js';

export const fetchAddressesTree = async (url: string, treeRoot: string) => {
  const treeJson = await fetchJson<AddressesTree>(url, undefined);

  const tree = StandardMerkleTree.load(treeJson);

  if (compareLowercase(tree.root, treeRoot)) return tree;

  return null;
};
