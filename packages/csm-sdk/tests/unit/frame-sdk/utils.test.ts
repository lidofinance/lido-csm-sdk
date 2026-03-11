import { describe, it, expect } from 'vitest';
import {
  slotToTimestamp,
  timestampToSlot,
  slotToEpoch,
  epochToSlot,
  epochToTimestamp,
  getSlotsPerFrame,
  getFrameDuration,
} from '../../../src/frame-sdk/utils.js';
import type { FrameConfig } from '../../../src/frame-sdk/types.js';

const config: FrameConfig = {
  slotsPerEpoch: 32n,
  secondsPerSlot: 12n,
  genesisTime: 1_606_824_023n,
  epochsPerFrame: 225n,
};

describe('slotToTimestamp', () => {
  it('computes timestamp for slot 0', () => {
    expect(slotToTimestamp(0n, config)).toBe(Number(config.genesisTime));
  });

  it('computes timestamp for a given slot', () => {
    // slot 100 → genesisTime + 100 * 12 = 1606824023 + 1200
    expect(slotToTimestamp(100n, config)).toBe(1_606_824_023 + 1200);
  });

  it('accepts number input', () => {
    expect(slotToTimestamp(100, config)).toBe(1_606_824_023 + 1200);
  });
});

describe('timestampToSlot', () => {
  it('returns 0 for genesis time', () => {
    expect(timestampToSlot(1_606_824_023, config)).toBe(0n);
  });

  it('round-trips with slotToTimestamp', () => {
    const slot = 12_345n;
    const ts = slotToTimestamp(slot, config);
    expect(timestampToSlot(ts, config)).toBe(slot);
  });

  it('accepts bigint timestamp', () => {
    expect(timestampToSlot(1_606_824_023n + 120n, config)).toBe(10n);
  });
});

describe('slotToEpoch', () => {
  it('returns epoch 0 for slot 0', () => {
    expect(slotToEpoch(0n, config)).toBe(0n);
  });

  it('returns correct epoch for exact boundary', () => {
    expect(slotToEpoch(32n, config)).toBe(1n);
    expect(slotToEpoch(64n, config)).toBe(2n);
  });

  it('returns floor for mid-epoch slot', () => {
    expect(slotToEpoch(33n, config)).toBe(1n);
    expect(slotToEpoch(63n, config)).toBe(1n);
  });

  it('accepts number input', () => {
    expect(slotToEpoch(64, config)).toBe(2n);
  });
});

describe('epochToSlot', () => {
  it('returns slot 0 for epoch 0', () => {
    expect(epochToSlot(0n, config)).toBe(0n);
  });

  it('multiplies epoch by slotsPerEpoch', () => {
    expect(epochToSlot(3n, config)).toBe(96n);
  });

  it('accepts number input', () => {
    expect(epochToSlot(3, config)).toBe(96n);
  });
});

describe('epochToTimestamp', () => {
  it('composes epochToSlot and slotToTimestamp', () => {
    const epoch = 5n;
    const expectedSlot = epoch * config.slotsPerEpoch;
    const expectedTs = slotToTimestamp(expectedSlot, config);
    expect(epochToTimestamp(epoch, config)).toBe(expectedTs);
  });
});

describe('getSlotsPerFrame', () => {
  it('returns epochsPerFrame * slotsPerEpoch', () => {
    expect(getSlotsPerFrame(config)).toBe(225n * 32n);
  });
});

describe('getFrameDuration', () => {
  it('returns duration in seconds as number', () => {
    // 225 * 32 * 12 = 86400
    const result = getFrameDuration(config);
    expect(result).toBe(86_400);
    expect(typeof result).toBe('number');
  });
});
