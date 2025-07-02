import { Hex, isHex, size, slice } from 'viem';
import { PUBKEY_LENGTH_BYTES } from '../constants/keys.js';

export const splitKeys = (
  value: Hex,
  _count?: number,
  bytesLength = PUBKEY_LENGTH_BYTES,
) => {
  if (!isHex(value)) {
    throw new Error('is not a hex-like string');
  }
  const count = _count ?? Math.ceil(size(value) / bytesLength);

  return Array.from({ length: count }, (_, i) =>
    slice(value, i * bytesLength, (i + 1) * bytesLength),
  );
};
