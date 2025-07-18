import { CSM_SUPPORTED_CHAINS } from '../../common/index.js';
import { compareLowercase } from '../../common/utils/compare-lowercase.js';
import { isHexadecimalString } from '../../common/utils/is-hexadecimal-string.js';
import { DepositData, DepositDataV1, DepositDataV2 } from '../types.js';
import {
  FIXED_AMOUNT,
  FIXED_FORK_VERSION,
  FIXED_NETWORK,
  FIXED_WC_PREFIX,
  PUBKEY_LENGTH,
  SIGNATURE_LENGTH,
} from './constants.js';

export const checkItem = (
  data: DepositData,
  chainId: CSM_SUPPORTED_CHAINS,
  wc: string,
): string | void => {
  if (
    typeof data.pubkey !== 'string' ||
    data.pubkey.length !== PUBKEY_LENGTH ||
    !isHexadecimalString(data.pubkey)
  ) {
    return 'pubkey is not valid string';
  }

  if (
    typeof data.signature !== 'string' ||
    data.signature.length !== SIGNATURE_LENGTH ||
    !isHexadecimalString(data.signature)
  ) {
    return 'signature is not valid string';
  }

  if (typeof data.deposit_message_root !== 'string') {
    return 'deposit_message_root is not a string';
  }

  if (typeof data.deposit_data_root !== 'string') {
    return 'deposit_data_root is not a string';
  }

  if (typeof data.withdrawal_credentials !== 'string') {
    return 'withdrawal_credentials is not a string';
  }

  if (data.amount !== FIXED_AMOUNT) {
    return 'amount is not equal to 32 eth';
  }

  const networkNames = FIXED_NETWORK[chainId];
  if (
    !networkNames?.includes(
      (data as DepositDataV2).network_name ||
        (data as DepositDataV1).eth2_network_name,
    )
  ) {
    const networks = networkNames?.join(', ');

    return `network_name or eth2_network_name is not equal to ${networks}`;
  }

  const forkVersion = FIXED_FORK_VERSION[chainId];
  if (data.fork_version !== forkVersion) {
    return `fork_version is not equal to ${forkVersion}`;
  }

  if (
    !compareLowercase(data.withdrawal_credentials, `${FIXED_WC_PREFIX}${wc}`) &&
    !compareLowercase(data.withdrawal_credentials, `${wc}`)
  ) {
    return `withdrawal_credentials is not equal to ${wc}`;
  }
};
