import { DepositDataKey } from '../types.js';
import { toHexString, trimHexPrefix } from './index.js';

export const parseDepositData = (keys: DepositDataKey[]) => {
  const publicKeys = keys.map((key) => trimHexPrefix(key.pubkey));
  const signatures = keys.map((key) => trimHexPrefix(key.signature));

  return {
    keysCount: BigInt(keys.length),
    publicKeys: toHexString(publicKeys.join('')),
    signatures: toHexString(signatures.join('')),
  };
};
