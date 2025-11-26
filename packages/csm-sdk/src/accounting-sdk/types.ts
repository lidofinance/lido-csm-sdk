import { NodeOperatorId, PerToken } from '../common/types.js';

export type AmountByKeys = PerToken<bigint>;

export type StethPoolData = {
  totalPooledEther: bigint;
  totalShares: bigint;
};

export type KeysCountByBondAmountProps = {
  curveId: bigint;
  amount: bigint;
};

export type BondAmountByKeysCountProps = {
  curveId: bigint;
  keysCount: bigint;
};

export type BondForNextKeysProps = {
  nodeOperatorId: NodeOperatorId;
  keysCount: bigint;
};
