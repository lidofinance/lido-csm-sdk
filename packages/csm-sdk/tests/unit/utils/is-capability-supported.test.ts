import { describe, it, expect } from 'vitest';
import { isCapabilitySupported } from '../../../src/common/utils/is-capability-supported.js';

describe('isCapabilitySupported', () => {
  it('returns true when status is "supported"', () => {
    const caps = { 1: { atomicBatch: { status: 'supported' as const } } };
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(true);
  });

  it('returns false when status is "unsupported"', () => {
    const caps = { 1: { atomicBatch: { status: 'unsupported' as const } } };
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(false);
  });

  it('returns true when supported boolean is true', () => {
    const caps = { 1: { atomicBatch: { supported: true } } };
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(true);
  });

  it('returns false when supported boolean is false', () => {
    const caps = { 1: { atomicBatch: { supported: false } } };
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(false);
  });

  it('returns false when capability is missing', () => {
    const caps = { 1: {} };
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(false);
  });

  it('returns false when chainId is missing', () => {
    const caps = {};
    expect(isCapabilitySupported(caps, 1, 'atomicBatch')).toBe(false);
  });

  it('falls back to caps[0] when chainId not found', () => {
    const caps = { 0: { atomicBatch: { supported: true } } };
    expect(isCapabilitySupported(caps, 999, 'atomicBatch')).toBe(true);
  });
});
