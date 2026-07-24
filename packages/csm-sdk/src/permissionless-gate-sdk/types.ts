import type { Address } from 'viem';
import {
  DepositDataKey,
  NodeOperatorShortInfo,
  PermitSignatureShort,
} from '../common/index';
import { CommonTransactionProps } from '../tx-sdk/types';

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
