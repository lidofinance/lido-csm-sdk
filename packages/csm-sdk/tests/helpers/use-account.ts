import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { testEnv } from './env';

const SECP256K1_MOD = 1n << 256n;

let primary: PrivateKeyAccount | null = null;
const altCache = new Map<bigint, PrivateKeyAccount>();

export const useAccount = (): PrivateKeyAccount => {
  if (!primary)
    primary = privateKeyToAccount(testEnv.privateKey() as `0x${string}`);
  return primary;
};

// Returns a deterministic PrivateKeyAccount derived from the primary key.
// Pass a seed unique to your test file (any bigint, default 1n) to keep
// nonce/balance state isolated from other tests that share the singleFork
// anvil. Cached per-seed so equality checks survive repeated calls.
//
// The modulo keeps the result inside the 32-byte private-key window even if
// TEST_PRIVATE_KEY is set near 2^256 — padStart alone would emit a 65-char
// hex that privateKeyToAccount rejects with a misleading error.
export const useAltAccount = (seed: bigint = 1n): PrivateKeyAccount => {
  const cached = altCache.get(seed);
  if (cached) return cached;
  const pk = (BigInt(testEnv.privateKey()) + seed) % SECP256K1_MOD;
  const hex = `0x${pk.toString(16).padStart(64, '0')}` as `0x${string}`;
  const account = privateKeyToAccount(hex);
  altCache.set(seed, account);
  return account;
};
