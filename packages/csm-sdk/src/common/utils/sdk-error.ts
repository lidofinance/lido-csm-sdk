import { classifyError } from './classify-error';
import {
  type DecodedRevert,
  decodeRevertData,
  formatDecodedRevert,
} from './decode-revert-data';
import { ERROR_CODE } from './sdk-error-code';

export { ERROR_CODE } from './sdk-error-code';

export type SDKErrorProps = {
  code?: ERROR_CODE;
  error?: unknown;
  message?: string;
  decodedRevert?: DecodedRevert;
};

export class SDKError extends Error {
  public static from(error: unknown, code?: ERROR_CODE): SDKError {
    if (error instanceof SDKError) return error;

    const baseMessage =
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'something went wrong';

    const decodedRevert = decodeRevertData(error);
    const message = decodedRevert
      ? formatDecodedRevert(decodedRevert)
      : baseMessage;

    // Classifier wins when it identifies a viem class — it is more specific
    // than any context-only code (e.g. TRANSACTION_ERROR) supplied by a
    // `withSDKError(..., code)` call site. When viem yields nothing, fall back
    // to the caller-supplied code, then to UNKNOWN_ERROR.
    const classifiedCode = classifyError(error, decodedRevert);
    const finalCode = classifiedCode ?? code ?? ERROR_CODE.UNKNOWN_ERROR;

    return new SDKError({ code: finalCode, error, message, decodedRevert });
  }

  public code: ERROR_CODE;
  public decodedRevert: DecodedRevert | undefined;

  constructor({ code, error, message, decodedRevert }: SDKErrorProps) {
    super(message);
    this.name = 'SDKError';
    // Preserve the full upstream error as `cause`. Previous behavior assigned
    // `error.cause`, which silently discarded the top viem BaseError and forced
    // every consumer to walk the chain via a separate channel.
    if (error !== undefined) {
      this.cause = error;
    }
    if (error instanceof Error && error.stack) {
      this.stack = error.stack;
    }
    this.code = code ?? ERROR_CODE.UNKNOWN_ERROR;
    this.decodedRevert = decodedRevert;
  }

  /**
   * @deprecated Use `message` (idiomatic `Error` field) instead. Will be
   * removed in the next major. For structured access to a decoded contract
   * revert, read `decodedRevert` ({ name, args }).
   */
  public get errorMessage(): string | undefined {
    return this.message || undefined;
  }
}

// invariant that throws SDK ERROR
// eslint-disable-next-line func-style
export function invariant(
  condition: any,
  message: string,
  code?: ERROR_CODE,
): asserts condition {
  if (condition) return;

  throw new SDKError({ message, code });
}

// shortcut for argument error
// eslint-disable-next-line func-style
export function invariantArgument(
  condition: any,
  message: string,
): asserts condition {
  if (condition) return;

  throw new SDKError({ code: ERROR_CODE.INVALID_ARGUMENT, message });
}

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
