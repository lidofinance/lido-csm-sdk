import { Address, Hex } from 'viem';
import { KEY_STATUS } from '../common/index.js';
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
