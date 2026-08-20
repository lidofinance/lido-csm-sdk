import { describe, it, expect } from 'vitest';
import { toCidV1Base32 } from '../../../src/common/utils/to-cid-v1-base32';

describe('toCidV1Base32', () => {
  it('converts the canonical multiformats CIDv0 to CIDv1 base32', () => {
    expect(
      toCidV1Base32('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco'),
    ).toBe('bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq');
  });

  it('returns a CIDv1 input unchanged', () => {
    const cidV1 = 'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq';
    expect(toCidV1Base32(cidV1)).toBe(cidV1);
  });

  it('returns invalid base58 input unchanged', () => {
    const invalid = 'Qm0abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOP';
    expect(toCidV1Base32(invalid)).toBe(invalid);
  });

  it('returns a wrong-length Qm string unchanged', () => {
    const tooShort = 'QmShort';
    expect(toCidV1Base32(tooShort)).toBe(tooShort);
  });
});
