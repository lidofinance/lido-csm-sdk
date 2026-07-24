import { describe, it, expect } from 'vitest';
import { SDKError } from '../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../src/common/utils/sdk-error-code';

// Backward-compat contract: pre-refactor consumers read `e.errorMessage`.
// It is a deprecated alias for `message` and must keep working.
describe('SDKError backward compatibility', () => {
  it('exposes errorMessage as an alias of message', () => {
    const error = new SDKError({
      code: ERROR_CODE.TRANSACTION_ERROR,
      message: 'boom',
    });

    expect(error.errorMessage).toBe('boom');
    expect(error.errorMessage).toBe(error.message);
  });

  it('returns undefined errorMessage for an empty message', () => {
    const error = new SDKError({ code: ERROR_CODE.UNKNOWN_ERROR });

    expect(error.message).toBe('');
    expect(error.errorMessage).toBeUndefined();
  });

  it('surfaces errorMessage through SDKError.from', () => {
    const error = SDKError.from(new Error('upstream failure'));

    expect(error.errorMessage).toBe('upstream failure');
    expect(error.errorMessage).toBe(error.message);
  });
});
