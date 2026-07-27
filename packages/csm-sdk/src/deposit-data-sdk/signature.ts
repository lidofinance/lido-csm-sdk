/**
 * Alternative BLS signature verification implementation for Ethereum deposit data.
 *
 * This implementation follows the Ethereum consensus specification closely:
 * - Proper SSZ serialization using @chainsafe/ssz
 * - Clear separation of domain computation, signing root, and verification
 * - Better error handling and type safety
 * - Compatible with both @chainsafe/bls and bls-eth-wasm
 *
 * Reference:
 * - https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/beacon-chain.md#bls-signatures
 * - https://github.com/ethereum/consensus-specs/blob/dev/specs/phase0/deposit-contract.md
 */

import { ByteVectorType, ContainerType, UintBigintType } from '@chainsafe/ssz';
import bls from 'bls-eth-wasm';
import { hexToBytes, toHex, type Hex } from 'viem';
import { SUPPORTED_CHAINS } from '../common/index';
import { DepositData } from './types';
import { DOMAIN_DEPOSIT, FIXED_FORK_VERSION } from './constants';

/**
 * SSZ Types following Ethereum consensus spec
 */

/** DepositMessage as per consensus spec */
const DepositMessageSSZ = new ContainerType({
  pubkey: new ByteVectorType(48),
  withdrawal_credentials: new ByteVectorType(32),
  amount: new UintBigintType(8),
});

/** ForkData for computing fork-specific domain */
const ForkDataSSZ = new ContainerType({
  current_version: new ByteVectorType(4),
  genesis_validators_root: new ByteVectorType(32),
});

/** SigningData for computing signing root */
const SigningDataSSZ = new ContainerType({
  object_root: new ByteVectorType(32),
  domain: new ByteVectorType(32),
});

/**
 * Type definitions
 */

type DepositMessage = {
  pubkey: Uint8Array;
  withdrawal_credentials: Uint8Array;
  amount: bigint;
};

type ForkData = {
  current_version: Uint8Array;
  genesis_validators_root: Uint8Array;
};

type SigningData = {
  object_root: Uint8Array;
  domain: Uint8Array;
};

/**
 * BLS initialization
 *
 * Memoized so concurrent verifications share a single `bls.init()` call —
 * `bls.init()` has no internal guard and allocates a fresh, non-growable WASM
 * memory on every call, so firing it once per item in a batch OOMs. The memo
 * resets on rejection so a transient init failure can be retried.
 */
let blsInitPromise: Promise<void> | undefined;

const ensureBLSInit = (): Promise<void> =>
  (blsInitPromise ??= bls.init(bls.BLS12_381).catch((error) => {
    blsInitPromise = undefined;
    throw error;
  }));

/**
 * Helper to ensure hex strings have 0x prefix
 */
const ensureHex = (value: string): Hex => {
  return (value.startsWith('0x') ? value : `0x${value}`) as Hex;
};

/**
 * Get fork version for the chain
 * @throws {Error} If fork version is not found
 */
const getForkVersion = (chainId: SUPPORTED_CHAINS): Uint8Array => {
  const version = FIXED_FORK_VERSION[chainId];
  if (!version) {
    throw new Error(`Fork version not found for chain ${chainId}`);
  }
  // Fork version is 4 bytes, pad if necessary
  const hex = version.padStart(8, '0');
  return hexToBytes(ensureHex(hex));
};

/**
 * Compute fork data root using SSZ
 *
 * per consensus spec:
 * def compute_fork_data_root(current_version: Version, genesis_validators_root: Root) -> Root:
 *     return hash_tree_root(ForkData(
 *         current_version=current_version,
 *         genesis_validators_root=genesis_validators_root,
 *     ))
 */
const computeForkDataRoot = (
  currentVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array,
): Uint8Array => {
  const forkData: ForkData = {
    current_version: currentVersion,
    genesis_validators_root: genesisValidatorsRoot,
  };
  return ForkDataSSZ.hashTreeRoot(forkData);
};

/**
 * Compute domain using domain type and fork data root
 *
 * per consensus spec:
 * def compute_domain(domain_type: DomainType, fork_version: Version=None, genesis_validators_root: Root=None) -> Domain:
 *     if fork_version is None:
 *         fork_version = config.GENESIS_FORK_VERSION
 *     if genesis_validators_root is None:
 *         genesis_validators_root = Root()
 *     fork_data_root = compute_fork_data_root(fork_version, genesis_validators_root)
 *     return Domain(domain_type + fork_data_root[:28])
 */
const computeDomain = (
  domainType: Uint8Array,
  forkVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array,
): Uint8Array => {
  const forkDataRoot = computeForkDataRoot(forkVersion, genesisValidatorsRoot);

  // Domain is domain_type (4 bytes) + first 28 bytes of fork_data_root
  const domain = new Uint8Array(32);
  domain.set(domainType, 0);
  domain.set(forkDataRoot.slice(0, 28), 4);

  return domain;
};

/**
 * Compute signing root from object root and domain
 *
 * per consensus spec:
 * def compute_signing_root(ssz_object: SSZObject, domain: Domain) -> Root:
 *     return hash_tree_root(SigningData(
 *         object_root=hash_tree_root(ssz_object),
 *         domain=domain,
 *     ))
 */
const computeSigningRoot = (
  objectRoot: Uint8Array,
  domain: Uint8Array,
): Uint8Array => {
  const signingData: SigningData = {
    object_root: objectRoot,
    domain: domain,
  };
  return SigningDataSSZ.hashTreeRoot(signingData);
};

/**
 * Compute deposit message root (hash tree root of DepositMessage)
 */
const computeDepositMessageRoot = (message: DepositMessage): Uint8Array => {
  return DepositMessageSSZ.hashTreeRoot(message);
};

/**
 * Verify BLS signature for deposit data following Ethereum consensus spec
 *
 * @param data - Deposit data to verify
 * @param chainId - Chain ID (mainnet or testnet)
 * @returns Promise<boolean> - True if signature is valid
 *
 * Returns `false` only for genuinely invalid deposit data (malformed hex,
 * undeserializable curve points, mismatched deposit_message_root). Throws on
 * infrastructure failures (WASM init, verify-time throws, unexpected library
 * errors) instead of misreporting them as an invalid signature — callers are
 * expected to handle the rejection per-item (`validateDepositData` maps it to
 * `BLS_VERIFICATION_UNAVAILABLE`).
 *
 * @example
 * const isValid = await verifyDepositSignature(depositData, CHAINS.Mainnet);
 * if (!isValid) {
 *   console.error('Invalid signature');
 * }
 */
export const verifyDepositSignature = async (
  data: DepositData,
  chainId: SUPPORTED_CHAINS,
): Promise<boolean> => {
  await ensureBLSInit();

  let pubkey: Uint8Array;
  let signature: Uint8Array;
  let withdrawalCredentials: Uint8Array;
  let amount: bigint;

  try {
    // Parse input data (fields are already Hex type)
    pubkey = hexToBytes(data.pubkey);
    signature = hexToBytes(data.signature);
    withdrawalCredentials = hexToBytes(data.withdrawal_credentials);
    amount = BigInt(data.amount);

    // Validate input sizes
    if (
      pubkey.length !== 48 ||
      signature.length !== 96 ||
      withdrawalCredentials.length !== 32
    ) {
      return false;
    }
  } catch {
    return false;
  }

  // Build DepositMessage
  const depositMessage: DepositMessage = {
    pubkey,
    withdrawal_credentials: withdrawalCredentials,
    amount,
  };

  // Step 1: Compute deposit message root
  const messageRoot = computeDepositMessageRoot(depositMessage);

  // Verify deposit_message_root matches
  if (
    toHex(messageRoot).toLowerCase() !== data.deposit_message_root.toLowerCase()
  ) {
    return false;
  }

  // Step 2: Get chain-specific parameters
  const forkVersion = getForkVersion(chainId);
  // IMPORTANT: Per Ethereum spec, deposit signatures use ZERO genesis_validators_root
  // "The sole exception to the mixing-in of the fork version is signatures on deposits"
  // Reference: staking-deposit-cli uses ZERO_BYTES32 for deposits
  const genesisValidatorsRoot = new Uint8Array(32); // All zeros

  // Step 3: Compute domain
  const domainType = hexToBytes(DOMAIN_DEPOSIT as Hex);
  const domain = computeDomain(domainType, forkVersion, genesisValidatorsRoot);

  // Step 4: Compute signing root
  const signingRoot = computeSigningRoot(messageRoot, domain);

  // Step 5: Verify BLS signature
  let publicKey: InstanceType<typeof bls.PublicKey>;
  let sig: InstanceType<typeof bls.Signature>;

  try {
    publicKey = new bls.PublicKey();
    publicKey.deserialize(pubkey);

    sig = new bls.Signature();
    sig.deserialize(signature);
  } catch {
    return false;
  }

  try {
    return publicKey.verify(sig, signingRoot);
  } catch (error) {
    // A verify-time throw means the WASM instance is in a bad state (the
    // fixed, non-growable heap leaks stack allocations on throw). Reset the
    // init memo so the next call re-inits a fresh instance instead of
    // failing for the rest of the session.
    blsInitPromise = undefined;
    throw error;
  }
};
