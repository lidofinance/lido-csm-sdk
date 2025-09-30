import { CSM_SUPPORTED_CHAINS } from '../common/index.js';

export type DepositDataCommon = {
  pubkey: string;
  withdrawal_credentials: string;
  amount: number;
  signature: string;
  deposit_message_root: string;
  deposit_data_root: string;
  fork_version: string;
  deposit_cli_version: string;
};

export type DepositDataV2 = DepositDataCommon & {
  network_name: string;
};

export type DepositDataV1 = DepositDataCommon & {
  eth2_network_name: string;
};

export type DepositData = DepositDataV2 | DepositDataV1;

export enum ValidationErrorCode {
  INVALID_PUBKEY = 'INVALID_PUBKEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_WITHDRAWAL_CREDENTIALS = 'INVALID_WITHDRAWAL_CREDENTIALS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_NETWORK = 'INVALID_NETWORK',
  INVALID_FORK_VERSION = 'INVALID_FORK_VERSION',
  INVALID_DEPOSIT_ROOT = 'INVALID_DEPOSIT_ROOT',
  DUPLICATE_PUBKEY = 'DUPLICATE_PUBKEY',
  PREVIOUSLY_SUBMITTED = 'PREVIOUSLY_SUBMITTED',
  INVALID_BLS_SIGNATURE = 'INVALID_BLS_SIGNATURE',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
}

export type ValidationError = {
  index: number;
  field?: string;
  message: string;
  code: ValidationErrorCode;
};

export type RemoveKeyResult = {
  success: boolean;
  data?: DepositData[];
  json?: string;
  error?: string;
};

export type ParseResult = {
  success: boolean;
  data?: DepositData[];
  error?: string;
};

export type ValidationProps = {
  chainId: CSM_SUPPORTED_CHAINS;
  withdrawalCredentials: string;
};

export type ValidationExtendedProps = ValidationProps & {
  currentBlockNumber?: number;
};

export type DuplicateProcessingConfig = {
  pubkey: string;
  index: number;
  pubkeyMap: Map<string, number[]>;
  errors: ValidationError[];
};
