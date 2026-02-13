import type { Address, Hex, JsonRpcAccount } from 'viem';
import {
  DepositDataKey,
  NodeOperatorId,
  PermitSignatureShort,
} from '../common/index.js';
import { CommonTransactionProps } from '../tx-sdk/types.js';

export type AddKeysProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  depositData: DepositDataKey[];
  permit?: PermitSignatureShort;
};

export type AddKeysInnerProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  keysCount: bigint;
  publicKeys: Hex;
  signatures: Hex;
  permit?: PermitSignatureShort;
  account: JsonRpcAccount;
};

export type RemoveKeysProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  startIndex: bigint;
  keysCount: bigint;
};

export type EjectKeysProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  startIndex: bigint;
  keysCount: bigint;
  refundRecipient?: Address;
};

export type EjectKeysByArrayProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  keyIndices: bigint[];
  refundRecipient?: Address;
};
