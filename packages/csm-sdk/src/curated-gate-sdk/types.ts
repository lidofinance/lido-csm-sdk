import type { Address } from 'viem';
import { NodeOperatorShortInfo, Proof } from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

// Re-export shared types from ics-gate-sdk to avoid duplication
// TODO: common types
export type { AddressesTreeLeaf, AddressProof } from '../ics-gate-sdk/types.js';

export type CreateNodeOperatorProps =
  CommonTransactionProps<NodeOperatorShortInfo> & {
    name: string;
    description: string;
    managerAddress: Address;
    rewardAddress: Address;
    proof: Proof;
  };

export type GateEligibility = {
  isPaused: boolean;
  curveId: bigint;
  proof: Proof | null;
  isConsumed: boolean;
  isEligible: boolean;
};
