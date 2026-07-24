import { DepositDataKey } from '../types';
import { toHexString, trimHexPrefix } from './index';

export const parseDepositData = (keys: DepositDataKey[]) => {
  const publicKeys = keys.map((key) => trimHexPrefix(key.pubkey));
  const signatures = keys.map((key) => trimHexPrefix(key.signature));

  return {
    keysCount: BigInt(keys.length),
    publicKeys: toHexString(publicKeys.join('')),
    signatures: toHexString(signatures.join('')),
  };
};
