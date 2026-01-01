import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { SUPPORTED_CHAINS } from '../common/index.js';

export const TRIM_LENGTH = 6;

export const PUBKEY_LENGTH = 96;
export const SIGNATURE_LENGTH = 192;
export const DEPOSIT_ROOT_LENGTH = 64;
export const WITHDRAWAL_CREDENTIALS_LENGTH = 64;

export const FIXED_AMOUNT = 32000000000;

export const FIXED_WC_PREFIX = '010000000000000000000000';

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
