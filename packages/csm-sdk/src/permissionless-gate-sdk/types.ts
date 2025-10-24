import type { Address, Hex } from 'viem';
import {
  DepositDataKey,
  NodeOperatorShortInfo,
  PermitSignatureShort,
} from '../common/index.js';
import { CommonTransactionProps } from '../core-sdk/types.js';

export type AddNodeOperatorProps =
  CommonTransactionProps<NodeOperatorShortInfo> & {
    amount: bigint;
    depositData: DepositDataKey[];
    rewardsAddress?: Address | string;
    managerAddress?: Address | string;
    extendedManagerPermissions?: boolean;
    referrer?: Address;
    permit?: PermitSignatureShort;
  };

export type AddNodeOperatorInnerProps =
  CommonTransactionProps<NodeOperatorShortInfo> & {
    amount: bigint;
    keysCount: bigint;
    publicKeys: Hex;
    signatures: Hex;
    managementProperties: {
      rewardAddress: Address;
      managerAddress: Address;
      extendedManagerPermissions: boolean;
    };
    referrer: Address;
    permit?: PermitSignatureShort;
  };
