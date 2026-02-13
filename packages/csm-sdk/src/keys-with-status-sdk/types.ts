import { Address, Hex } from 'viem';
import { KEY_STATUS } from '../common/index.js';
import { NodeOperatorInfo } from '../operator-sdk/types.js';
import { KeyStrikes } from '../strikes-sdk/types.js';

export type KeyWithStatus = {
  pubkey: Hex;
  index: number;
  validatorIndex?: `${number}`;
  statuses: KEY_STATUS[];
  strikes?: KeyStrikes;
  effectiveBalance?: bigint;
};

type NetworkKey = {
  index: number;
  key: Hex;
  depositSignature: Hex;
  operatorIndex: number;
  used: boolean;
  moduleAddress: Address;
};

export type FindKeysResponse = {
  data: NetworkKey[];
  meta: any;
};

export type CLStatus =
  | 'pending_initialized'
  | 'pending_queued'
  | 'active_ongoing'
  | 'active_exiting'
  | 'active_slashed'
  | 'exited_unslashed'
  | 'exited_slashed'
  | 'withdrawal_possible'
  | 'withdrawal_done';

export type ClKey = {
  index: `${number}`;
  balance: `${number}`;
  status: CLStatus;
  validator: {
    pubkey: Hex;
    withdrawal_credentials: Hex;
    effective_balance: `${number}`;
    slashed: boolean;
    activation_eligibility_epoch: `${number}`;
    activation_epoch: `${number}`;
    exit_epoch: `${number}`;
    withdrawable_epoch: `${number}`;
  };
};

export type ClValidatorsResponse = {
  execution_optimistic: boolean;
  finalized: boolean;
  data: ClKey[];
};

export type ClPreparedKey = {
  validatorIndex: `${number}`;
  pubkey: Hex;
  status: KEY_STATUS;
  slashed: boolean;
  activationEpoch: bigint;
  effectiveBalance: bigint;
};

export type StatusContext = {
  pubkey: Hex;
  keyIndex: number;
  info: NodeOperatorInfo;
  prefilled?: ClPreparedKey;
  ejectableEpoch: bigint;
  unboundCount: number;
  duplicates: Hex[] | null;
  withdrawalSubmitted: Hex[] | null;
  requestedToExit: Hex[];
  hasCLStatuses: boolean;
  hasStrikes: boolean;
};
