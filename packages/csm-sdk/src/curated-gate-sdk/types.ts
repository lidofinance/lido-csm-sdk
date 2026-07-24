import type { Address } from 'viem';
import { NodeOperatorShortInfo, Proof } from '../common/index';
import { CommonTransactionProps } from '../tx-sdk/types';

export type CreateNodeOperatorProps =
  CommonTransactionProps<NodeOperatorShortInfo> & {
    name: string;
    description: string;
    managerAddress: Address;
    rewardAddress: Address;
    proof: Proof;
  };
