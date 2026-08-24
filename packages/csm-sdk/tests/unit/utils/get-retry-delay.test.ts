import { describe, it, expect } from 'vitest';
import { getRetryDelay } from '../../../src/common/utils/get-retry-delay';

describe('getRetryDelay', () => {
  it('honors a numeric Retry-After header, in seconds', () => {
    expect(getRetryDelay(0, '2')).toBe(2000);
  });

  it('caps Retry-After at 5s', () => {
    expect(getRetryDelay(0, '600')).toBe(5000);
  });

  it('backs off exponentially without a header', () => {
    expect(getRetryDelay(0, null)).toBe(500);
    expect(getRetryDelay(1, null)).toBe(1500);
  });

  it('ignores a non-numeric Retry-After header', () => {
    expect(getRetryDelay(0, 'Wed, 21 Oct 2015 07:28:00 GMT')).toBe(500);
  });

  it('ignores an empty Retry-After header', () => {
    expect(getRetryDelay(0, '')).toBe(500);
  });

  it('ignores a whitespace-only Retry-After header', () => {
    expect(getRetryDelay(1, '   ')).toBe(1500);
  });
});
