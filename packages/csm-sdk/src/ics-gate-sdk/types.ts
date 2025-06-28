import type { Address, Hex } from 'viem';
import {
  DepositDataKey,
  NodeOperatorId,
  PermitSignatureShort,
  Proof,
  StandardMerkleTreeData,
} from '../common/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';
import type { AddNodeOperatorResult } from '../permissionless-gate-sdk/types.js';

export type AddressesTreeLeaf = [Address];

export type AddressesTree = StandardMerkleTreeData<AddressesTreeLeaf>;

export type AddressProof = {
  proof: Proof | null;
  isConsumed: boolean;
};

export type AddVettedNodeOperatorProps =
  CommonTransactionProps<AddNodeOperatorResult> & {
    amount: bigint;
    depositData: DepositDataKey[];
    rewardsAddress?: Address | string;
    managerAddress?: Address | string;
    extendedManagerPermissions?: boolean;
    proof: Proof;
    referrer?: Address;
    permit?: PermitSignatureShort;
  };

export type AddVettedNodeOperatorInnerProps =
  CommonTransactionProps<AddNodeOperatorResult> & {
    amount: bigint;
    keysCount: bigint;
    publicKeys: Hex;
    signatures: Hex;
    managementProperties: {
      rewardAddress: Address;
      managerAddress: Address;
      extendedManagerPermissions: boolean;
    };
    proof: Proof;
    referrer: Address;
    permit?: PermitSignatureShort;
  };

export type ClaimCuvrveProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  proof: Proof;
};
