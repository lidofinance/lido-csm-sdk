import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
loadEnv({ path: resolve(here, '../../.env'), quiet: true });

const CHAIN_IDS = { mainnet: 1, hoodi: 560_048 } as const;

const readString = (key: string, fallback?: string): string => {
  // `||` not `??`: CI passes unset secrets as empty strings (`KEY:` with no
  // value), and `??` would keep `''` instead of falling back. Matches the
  // empty-as-absent handling in readNumber/readOptionalBigInt below.
  const value = process.env[key] || fallback;
  if (!value) throw new Error(`Missing env var ${key}`);
  return value;
};

const readNumber = (key: string, fallback?: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') {
    if (fallback === undefined) throw new Error(`Missing env var ${key}`);
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Env ${key} is not a number`);
  return n;
};

const readOptionalBigInt = (key: string): bigint | undefined => {
  const raw = process.env[key];
  if (!raw) return undefined;
  return BigInt(raw);
};

export const testEnv = {
  forkUrl: () => readString('TEST_RPC_URL'),
  chainId: () => readNumber('TEST_CHAIN_ID', CHAIN_IDS.hoodi),
  forkBlock: () => readOptionalBigInt('TEST_FORK_BLOCK'),
  privateKey: () =>
    readString(
      'TEST_PRIVATE_KEY',
      // Anvil dev account #0 — funded on every fork, NEVER use in production
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    ),
} as const;

export const CHAIN_ID = {
  MAINNET: CHAIN_IDS.mainnet,
  HOODI: CHAIN_IDS.hoodi,
} as const;
