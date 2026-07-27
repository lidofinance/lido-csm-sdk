import { describe, it, expect } from 'vitest';
import { chunkArray } from '../../../src/common/utils/chunk-array';
import { SDKError } from '../../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../../src/common/utils/sdk-error-code';

describe('chunkArray', () => {
  it('splits evenly', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('splits with remainder', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns an empty array for an empty input', () => {
    expect(chunkArray([], 2)).toEqual([]);
  });

  it.each([0, -1, 2.5, Number.NaN])(
    'throws SDKError with INVALID_ARGUMENT for size %s',
    (size) => {
      let error: unknown;
      try {
        chunkArray([1, 2, 3], size);
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(SDKError);
      expect(error).toMatchObject({
        code: ERROR_CODE.INVALID_ARGUMENT,
      } satisfies Partial<SDKError>);
    },
  );
});
