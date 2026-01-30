import { NodeOperatorId, Proof } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';
import type { Address } from 'viem';

// Re-export shared types from ics-gate-sdk to avoid duplication
// TODO: common types
export type { AddressesTreeLeaf, AddressProof } from '../ics-gate-sdk/types.js';

export type NodeOperatorCreated = {
  nodeOperatorId: NodeOperatorId;
};

export type CreateNodeOperatorProps =
  CommonTransactionProps<NodeOperatorCreated> & {
    name: string;
    description: string;
    managerAddress: Address;
    rewardAddress: Address;
    proof: Proof;
  };
