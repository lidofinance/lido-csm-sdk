import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { CONTRACT_NAMES, SUPPORTED_CHAINS } from '../common/index.js';
import { ModuleName } from '../core-sdk/types.js';

export const TRIM_LENGTH = 6;

export const PUBKEY_LENGTH = 96;
export const SIGNATURE_LENGTH = 192;
export const DEPOSIT_ROOT_LENGTH = 64;
export const WITHDRAWAL_CREDENTIALS_LENGTH = 64;

export const FIXED_AMOUNT = 32000000000;

export const WC_PREFIX_01 = '010000000000000000000000';
export const WC_PREFIX_02 = '020000000000000000000000';

export const WC_PREFIX_BY_MODULE: Record<ModuleName, string> = {
  [CONTRACT_NAMES.csModule]: WC_PREFIX_01,
  [CONTRACT_NAMES.curatedModule]: WC_PREFIX_02,
};

export const FIXED_NETWORK: Record<SUPPORTED_CHAINS, string> = {
  [CHAINS.Mainnet]: 'mainnet',
  [CHAINS.Hoodi]: 'hoodi',
};

export const FIXED_FORK_VERSION: Record<SUPPORTED_CHAINS, string> = {
  [CHAINS.Mainnet]: '00000000',
  [CHAINS.Hoodi]: '10000910',
};

export const MAX_JSON_LENGTH = 1048576; // 1MB

export const DOMAIN_DEPOSIT = '0x03000000';
