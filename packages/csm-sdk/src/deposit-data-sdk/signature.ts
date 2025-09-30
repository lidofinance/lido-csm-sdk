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
import { CSM_SUPPORTED_CHAINS } from '../common/index.js';
import { DepositData } from './types.js';
import { DOMAIN_DEPOSIT, FIXED_FORK_VERSION } from './constants.js';

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
 */
let blsInitialized = false;

const ensureBLSInit = async (): Promise<void> => {
  if (!blsInitialized) {
    await bls.init(bls.BLS12_381);
    blsInitialized = true;
  }
};

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
const getForkVersion = (chainId: CSM_SUPPORTED_CHAINS): Uint8Array => {
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
 * @example
 * const isValid = await verifyDepositSignature(depositData, CHAINS.Mainnet);
 * if (!isValid) {
 *   console.error('Invalid signature');
 * }
 */
export const verifyDepositSignature = async (
  data: DepositData,
  chainId: CSM_SUPPORTED_CHAINS,
): Promise<boolean> => {
  try {
    // Initialize BLS library
    await ensureBLSInit();

    // Parse input data
    const pubkey = hexToBytes(ensureHex(data.pubkey));
    const signature = hexToBytes(ensureHex(data.signature));
    const withdrawalCredentials = hexToBytes(
      ensureHex(data.withdrawal_credentials),
    );
    const amount = BigInt(data.amount);

    // Validate input sizes
    if (pubkey.length !== 48 || signature.length !== 96 || withdrawalCredentials.length !== 32) {
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
    const providedMessageRoot = ensureHex(data.deposit_message_root);
    if (toHex(messageRoot).toLowerCase() !== providedMessageRoot.toLowerCase()) {
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
    const domain = computeDomain(
      domainType,
      forkVersion,
      genesisValidatorsRoot,
    );

    // Step 4: Compute signing root
    const signingRoot = computeSigningRoot(messageRoot, domain);

    // Step 5: Verify BLS signature
    const publicKey = new bls.PublicKey();
    publicKey.deserialize(pubkey);

    const sig = new bls.Signature();
    sig.deserialize(signature);

    return publicKey.verify(sig, signingRoot);
  } catch {
    return false;
  }
};
