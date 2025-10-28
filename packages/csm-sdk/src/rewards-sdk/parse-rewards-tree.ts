// import { JSONParse } from 'json-with-bigint';

import { StandardMerkleTreeData } from '../common/types.js';
import { RewardsTreeLeaf } from './types.js';

const prepare = (text: string) =>
  text.replace(
    /"value"\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/gm,
    '"value":["$1","$2"]',
  );

export const parseRewardsTree = (
  text: string,
): StandardMerkleTreeData<RewardsTreeLeaf> => {
  return JSON.parse(prepare(text));
};
