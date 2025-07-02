import { Hex } from 'viem';
import { DepositDataKey } from '../types.js';

const formatHex = (keys: string[]): Hex => `0x${keys.join('')}`;

export const parseDepositData = (keys: DepositDataKey[]) => {
  const publicKeys = keys.map((key) => key.pubkey);
  const signatures = keys.map((key) => key.signature);

  return {
    keysCount: BigInt(keys.length),
    publicKeys: formatHex(publicKeys),
    signatures: formatHex(signatures),
  };
};
