import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { RewardsTree } from './types.js';
import { fetchJson } from '../common/utils/fetch-json.js';

const prepare = (text: string) =>
  text.replace(
    /"value"\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/gm,
    '"value":["$1","$2"]',
  );

export const fetchRewardsTree = async (url: string, treeRoot: string) => {
  const treeJson = await fetchJson<RewardsTree>(url, undefined, (text) =>
    JSON.parse(prepare(text)),
  );

  const tree = StandardMerkleTree.load(treeJson);

  if (compareLowercase(tree.root, treeRoot)) return tree;

  return null;
};
