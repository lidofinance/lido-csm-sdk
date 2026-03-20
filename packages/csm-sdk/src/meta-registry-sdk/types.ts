import { Hex } from 'viem';

import { NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

export type OperatorMetadata = {
  name: string;
  description: string;
  ownerEditsRestricted: boolean;
};

export type SetOperatorDataProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
} & Omit<OperatorMetadata, 'ownerEditsRestricted'>;

export type SubNodeOperator = {
  nodeOperatorId: bigint;
  share: number;
};

export type RawExternalOperator = {
  data: Hex;
};

export type ExternalOperatorNOR = {
  moduleId: bigint;
  nodeOperatorId: bigint;
};

export type DecodedExternalOperator =
  | ({ type: 'NOR' } & ExternalOperatorNOR)
  | ({ type: 'unknown' } & RawExternalOperator);

export type GroupOperators = {
  subNodeOperators: readonly SubNodeOperator[];
  externalOperators: readonly DecodedExternalOperator[];
};

export type GroupInfo = {
  groupId: bigint;
} & GroupOperators;

export type OperatorStakeSummary = OperatorStakeInfo & {
  weight: bigint;
};

export type OperatorStakeInfo = {
  currentStake: bigint;
  targetStake: bigint;
};

export type OperatorKeysInfo = {
  currentKeys: number;
  targetKeys: number;
};

export type OperatorGroupStakeSummary = GroupInfo & {
  operators: SubOperatorStakeSummary[];
};

export type SubOperatorStakeSummary = OperatorStakeSummary & {
  nodeOperatorId: NodeOperatorId;
  share: number;
};
