import { Hex } from 'viem';
import { SUPPORTED_CHAINS } from '../common/index';

export type DepositData = {
  pubkey: Hex;
  withdrawal_credentials: Hex;
  amount: number;
  signature: Hex;
  deposit_message_root: Hex;
  deposit_data_root: Hex;
  fork_version: Hex;
  network_name: string;
  deposit_cli_version: string;
};

export enum ValidationErrorCode {
  INVALID_PUBKEY = 'INVALID_PUBKEY',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_WITHDRAWAL_CREDENTIALS = 'INVALID_WITHDRAWAL_CREDENTIALS',
  UNSUPPORTED_WC_TYPE = 'UNSUPPORTED_WC_TYPE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_NETWORK = 'INVALID_NETWORK',
  INVALID_FORK_VERSION = 'INVALID_FORK_VERSION',
  INVALID_DEPOSIT_ROOT = 'INVALID_DEPOSIT_ROOT',
  DUPLICATE_PUBKEY = 'DUPLICATE_PUBKEY',
  CACHED_PUBKEY_CONFIRMED = 'CACHED_PUBKEY_CONFIRMED',
  CACHED_PUBKEY_PENDING = 'CACHED_PUBKEY_PENDING',
  PREVIOUSLY_SUBMITTED = 'PREVIOUSLY_SUBMITTED',
  INVALID_BLS_SIGNATURE = 'INVALID_BLS_SIGNATURE',
  BLS_VERIFICATION_UNAVAILABLE = 'BLS_VERIFICATION_UNAVAILABLE',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  VALIDATOR_EXISTS = 'VALIDATOR_EXISTS',
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
  chainId: SUPPORTED_CHAINS;
  withdrawalCredentials: string;
  wcPrefix: string;
};

export type ValidationExtendedProps = ValidationProps & {
  currentBlockNumber?: number;
  skipSignature?: boolean;
};

export type DuplicateProcessingConfig = {
  pubkey: Hex;
  index: number;
  pubkeyMap: Map<Hex, number[]>;
  errors: ValidationError[];
};
