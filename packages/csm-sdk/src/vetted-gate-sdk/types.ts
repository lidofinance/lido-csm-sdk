import type { Address } from 'viem';
import {
  CONTRACT_NAMES,
  DepositDataKey,
  NodeOperatorId,
  NodeOperatorShortInfo,
  PermitSignatureShort,
  Proof,
} from '../common/index';
import { CommonTransactionProps } from '../tx-sdk/types';

export type VettedGateContractName =
  | CONTRACT_NAMES.icsGate
  | CONTRACT_NAMES.idvtcGate;

export type AddVettedNodeOperatorProps =
  CommonTransactionProps<NodeOperatorShortInfo> & {
    amount: bigint;
    depositData: DepositDataKey[];
    rewardsAddress?: Address | string;
    managerAddress?: Address | string;
    extendedManagerPermissions?: boolean;
    proof: Proof;
    referrer?: Address;
    permit?: PermitSignatureShort;
  };

export type ClaimCurveProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  proof: Proof;
};
