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

const formatRevert = (decoded: DecodedRevert): string => {
  if (!decoded.args.length) return decoded.name;
  const args = (decoded.args as readonly unknown[]).map(String).join(', ');
  return `${decoded.name}(${args})`;
};

export class SDKError extends Error {
  public static from(error: unknown, code?: ERROR_CODE): SDKError {
    if (error instanceof SDKError) return error;

    const decodedRevert = decodeRevertData(error);
    const message = decodedRevert
      ? formatRevert(decodedRevert)
      : messageOf(error);

    // Classifier wins over caller-supplied `code` when it identifies a viem
    // class — more specific than any context code (e.g. TRANSACTION_ERROR).
    // When the classifier yields nothing, fall back to `code`, then UNKNOWN.
    const finalCode =
      classifyError(error, decodedRevert) ?? code ?? ERROR_CODE.UNKNOWN_ERROR;

    return new SDKError({ code: finalCode, error, message, decodedRevert });
  }

  public code: ERROR_CODE;
  public decodedRevert: DecodedRevert | undefined;

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
