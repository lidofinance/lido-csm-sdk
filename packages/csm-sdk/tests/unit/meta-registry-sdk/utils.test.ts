import { describe, it, expect } from 'vitest';
import type { Hex } from 'viem';
import {
  decodeExternalOperatorNOR,
  decodeExternalOperator,
} from '../../../src/meta-registry-sdk/utils';

// Valid NOR entry: type=0 (1 byte), moduleId=1 (1 byte), nodeOperatorId=42 (8 bytes) = 10 bytes
// 0x00 01 000000000000002a
const VALID_NOR_DATA = '0x0001000000000000002a' as Hex;

describe('decodeExternalOperatorNOR', () => {
  it('decodes valid NOR data', () => {
    const result = decodeExternalOperatorNOR({ data: VALID_NOR_DATA });
    expect(result.moduleId).toBe(1n);
    expect(result.nodeOperatorId).toBe(42n);
  });

  it('throws for wrong data length', () => {
    expect(() => decodeExternalOperatorNOR({ data: '0x0001' as Hex })).toThrow(
      'Invalid NOR external operator data length',
    );
  });

  it('throws for wrong type byte', () => {
    // type=1 instead of 0
    const data = '0x0101000000000000002a' as Hex;
    expect(() => decodeExternalOperatorNOR({ data })).toThrow(
      'Invalid external operator type',
    );
  });

  it('handles zero values', () => {
    const data = '0x00000000000000000000' as Hex;
    const result = decodeExternalOperatorNOR({ data });
    expect(result.moduleId).toBe(0n);
    expect(result.nodeOperatorId).toBe(0n);
  });
});

describe('decodeExternalOperator', () => {
  it('returns NOR type for valid NOR data', () => {
    const result = decodeExternalOperator({ data: VALID_NOR_DATA });
    expect(result).toMatchObject({
      type: 'NOR',
      moduleId: 1n,
      nodeOperatorId: 42n,
    });
  });

  it('returns unknown for non-NOR type byte', () => {
    const data = '0x0201000000000000002a' as Hex;
    const result = decodeExternalOperator({ data });
    expect(result).toMatchObject({ type: 'unknown', data });
  });

  it('returns unknown for wrong data length', () => {
    const data = '0xdeadbeef' as Hex;
    const result = decodeExternalOperator({ data });
    expect(result.type).toBe('unknown');
  });
});
