import { describe, it, expect } from 'vitest';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { type Address, getAddress } from 'viem';
import { findAddressProof } from '../../../src/common/utils/find-address-proof.js';

const ADDR_A = '0x000000000000000000000000000000000000000a' as Address;
const ADDR_B = '0x000000000000000000000000000000000000000b' as Address;
const ADDR_MISSING = '0x000000000000000000000000000000000000ffff' as Address;

const makeAddressTree = (addresses: Address[]) =>
  StandardMerkleTree.of(
    addresses.map((a): [Address] => [a]),
    ['address'],
  );

describe('findAddressProof', () => {
  const tree = makeAddressTree([ADDR_A, ADDR_B]);

  it('returns proof for existing address', () => {
    const proof = findAddressProof(tree, ADDR_A);
    expect(proof).not.toBeNull();
    expect(Array.isArray(proof)).toBe(true);
    expect(proof!.length).toBeGreaterThan(0);
  });

  it('returns null for missing address', () => {
    expect(findAddressProof(tree, ADDR_MISSING)).toBeNull();
  });

  it('matches case-insensitively (checksummed vs lowercase)', () => {
    const checksummed = getAddress(ADDR_A);
    const proof = findAddressProof(tree, checksummed);
    expect(proof).not.toBeNull();
  });

  it('proof is an array of hex strings', () => {
    const proof = findAddressProof(tree, ADDR_B);
    expect(proof).not.toBeNull();
    for (const item of proof!) {
      expect(item).toMatch(/^0x[0-9a-f]+$/i);
    }
  });
});
