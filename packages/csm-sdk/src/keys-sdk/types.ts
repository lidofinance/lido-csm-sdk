import type { Hex, JsonRpcAccount } from 'viem';
import { DepositDataKey, NodeOperatorId } from '../common/index.js';
import { CommonTransactionProps, PermitSignature } from '../core-sdk/types.js';

export type AddKeysProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  depositData: DepositDataKey[];
  permit?: PermitSignature;
};

export type AddKeysInnerProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  amount: bigint;
  keysCount: bigint;
  publicKeys: Hex;
  signatures: Hex;
  permit?: PermitSignature;
  account: JsonRpcAccount;
};

export type RemoveKeysProps = CommonTransactionProps & {
  nodeOperatorId: NodeOperatorId;
  startIndex: bigint;
  keysCount: bigint;
};
