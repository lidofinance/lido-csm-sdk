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

export type OperatorGroup = {
  subNodeOperators: readonly SubNodeOperator[];
  externalOperators: readonly DecodedExternalOperator[];
};

export type OperatorWeightAndExternalStake = {
  weight: bigint;
  externalStake: bigint;
};
