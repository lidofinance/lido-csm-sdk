import { classifyError } from './classify-error';
import { type DecodedRevert, decodeRevertData } from './decode-revert-data';
import { ERROR_CODE } from './sdk-error-code';

export { ERROR_CODE } from './sdk-error-code';

export type SDKErrorProps = {
  code?: ERROR_CODE;
  error?: unknown;
  message?: string;
  decodedRevert?: DecodedRevert;
};

const messageOf = (error: unknown): string =>
  typeof error === 'object' &&
  error !== null &&
  'message' in error &&
  typeof error.message === 'string'
    ? error.message
    : 'something went wrong';

/**
 * Canonical `Name(arg1, arg2, ...)` label for a decoded contract revert.
 * Falls back to bare `Name` when the error has no args. Exposed so consumers
 * with a raw `decodedRevert` (e.g. from logs) can render the same string the
 * SDK uses as `Error.message`.
 */
export const formatDecodedRevert = (decoded: DecodedRevert): string => {
  if (!decoded.args.length) return decoded.name;
  const args = (decoded.args as readonly unknown[]).map(String).join(', ');
  return `${decoded.name}(${args})`;
};

/**
 * Typed wrapper around every error thrown by the SDK. Invariants:
 * - `code` is always set (defaults to {@link ERROR_CODE.UNKNOWN_ERROR}).
 * - `cause` preserves the original upstream error (typically a viem
 *   `BaseError`) so consumers can walk the chain.
 * - `decodedRevert` is present iff the underlying error carried a custom
 *   error selector decodable against the SDK's known ABIs.
 *
 * Branch on `code` for wallet / network conditions; narrow on
 * `decodedRevert.name` for typed contract revert args.
 *
 * @example
 * try { await sdk.bond.claimBondStETH(...) } catch (e) {
 *   if (!(e instanceof SDKError)) throw e;
 *   if (e.code === ERROR_CODE.USER_REJECTED) return;
 *   if (e.decodedRevert?.name === 'AccessControlUnauthorizedAccount') {
 *     const [account, role] = e.decodedRevert.args; // typed tuple
 *     showRoleErrorToast(account, role);
 *   }
 * }
 */
export class SDKError extends Error {
  /**
   * Wrap any thrown value into an `SDKError`. Pass `code` as a context hint
   * (e.g. `TRANSACTION_ERROR`); it is only used when {@link classifyError}
   * yields nothing. The classifier always wins because viem class detection
   * is strictly more specific than a context code.
   */
  public static from(error: unknown, code?: ERROR_CODE): SDKError {
    if (error instanceof SDKError) return error;

    const decodedRevert = decodeRevertData(error);
    const message = decodedRevert
      ? formatDecodedRevert(decodedRevert)
      : messageOf(error);

    const finalCode =
      classifyError(error, decodedRevert) ?? code ?? ERROR_CODE.UNKNOWN_ERROR;

    return new SDKError({ code: finalCode, error, message, decodedRevert });
  }

  /** Classified error category. Always set. See {@link ERROR_CODE}. */
  public code: ERROR_CODE;

  /**
   * Decoded contract revert, when the upstream error carried a selector
   * decodable against the SDK's combined ABI. Discriminated union: narrow on
   * `name` to get a typed `args` tuple.
   */
  public decodedRevert: DecodedRevert | undefined;

  /**
   * Original upstream error (typically a viem `BaseError`). Inherited from
   * `Error.cause`. Walk via `e.cause` to inspect the full chain.
   */
  declare public cause?: unknown;

  constructor({ code, error, message, decodedRevert }: SDKErrorProps) {
    super(message);
    this.name = 'SDKError';
    // Preserve full upstream error as `cause` — consumers walk it via the
    // standard Error chain. Previous code assigned `error.cause` and silently
    // dropped the top viem BaseError.
    if (error !== undefined) {
      this.cause = error;
    }
    if (error instanceof Error && error.stack) {
      this.stack = error.stack;
    }
    this.code = code ?? ERROR_CODE.UNKNOWN_ERROR;
    this.decodedRevert = decodedRevert;
  }
}

/**
 * Assert `condition` is truthy, otherwise throw an `SDKError` with the given
 * `message` and optional `code` (defaults to {@link ERROR_CODE.UNKNOWN_ERROR}).
 */
// eslint-disable-next-line func-style
export function invariant(
  condition: any,
  message: string,
  code?: ERROR_CODE,
): asserts condition {
  if (condition) return;

  throw new SDKError({ message, code });
}

/**
 * Shortcut for argument validation: throws with
 * {@link ERROR_CODE.INVALID_ARGUMENT}.
 */
// eslint-disable-next-line func-style
export function invariantArgument(
  condition: any,
  message: string,
): asserts condition {
  if (condition) return;

  throw new SDKError({ code: ERROR_CODE.INVALID_ARGUMENT, message });
}

/**
 * Await `func`; on rejection, rethrow as `SDKError.from(error, code)`.
 * `code` is a context fallback — the classifier still wins when it matches.
 */
export const withSDKError = async <TResult>(
  func: Promise<TResult>,
  code?: ERROR_CODE,
): Promise<TResult> => {
  try {
    return await func;
  } catch (error) {
    throw SDKError.from(error, code);
  }
};
