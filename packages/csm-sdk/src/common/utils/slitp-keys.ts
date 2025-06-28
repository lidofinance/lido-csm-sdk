import { Hex, isHex, size, slice } from 'viem';
import { PUBKEY_LENGTH } from '../constants/keys.js';

export const splitKeys = (
  value: Hex,
  _count?: number,
  bytesLength = PUBKEY_LENGTH,
) => {
  if (!isHex(value)) {
    throw new Error('is not a hex-like string');
  }
  const count = _count ?? Math.ceil(size(value) / bytesLength);

  return Array.from({ length: count }, (_, i) =>
    slice(value, i * count, (i + 1) * count),
  );
};
