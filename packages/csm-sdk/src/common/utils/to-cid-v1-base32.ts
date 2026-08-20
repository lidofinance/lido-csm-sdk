const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

const decodeBase58 = (input: string): Uint8Array | null => {
  const bytes = [0];

  for (const char of input) {
    const value = BASE58_ALPHABET.indexOf(char);
    if (value === -1) return null;

    let carry = value;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let i = 0; input[i] === '1'; i++) {
    bytes.push(0);
  }

  return new Uint8Array(bytes.reverse());
};

const encodeBase32 = (bytes: Uint8Array): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return output;
};

/** CIDv0 (base58btc `Qm…`) → CIDv1 base32. Anything else is returned unchanged. */
export const toCidV1Base32 = (cid: string): string => {
  if (!cid.startsWith('Qm')) return cid;

  const decoded = decodeBase58(cid);
  if (!decoded) return cid;

  // A valid CIDv0 is a sha2-256 multihash: 0x12 (code) + 0x20 (32-byte digest length) + digest.
  if (decoded.length !== 34 || decoded[0] !== 0x12 || decoded[1] !== 0x20) {
    return cid;
  }

  const prefixed = new Uint8Array([0x01, 0x70, ...decoded]);
  return `b${encodeBase32(prefixed)}`;
};
