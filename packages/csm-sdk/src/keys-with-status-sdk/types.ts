import { Address, Hex } from 'viem';
import { KEY_STATUS } from '../common/index';
import { KeyStrikes } from '../strikes-sdk/types';

export type KeyWithStatus = {
  pubkey: Hex;
  index: number;
  validatorIndex?: `${number}`;
  statuses: KEY_STATUS[];
  strikes?: KeyStrikes;
  effectiveBalance?: bigint;
  /** 0-based position in the global top-up queue. `undefined` = not queued / queue unavailable. */
  topUpPosition?: number;
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
