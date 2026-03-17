import { decodeRevertData } from './decode-revert-data.js';

export enum ERROR_CODE {
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  READ_ERROR = 'READ_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export type SDKErrorProps = {
  code?: ERROR_CODE;
  error?: unknown;
  message?: string;
};

export class SDKError extends Error {
  public static from(
    error: unknown,
    code: ERROR_CODE = ERROR_CODE.UNKNOWN_ERROR,
  ): SDKError {
    if (error instanceof SDKError) return error;

    const baseMessage =
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'something went wrong';

    const decoded = decodeRevertData(error);
    const message = decoded ?? baseMessage;

    return new SDKError({ code, error, message });
  }

  public code: ERROR_CODE;
  public errorMessage: string | undefined;

  constructor({ code, error = {}, message }: SDKErrorProps) {
    super(message);
    this.name = 'SDKError';
    if (error instanceof Error) {
      this.cause = error.cause;
      this.stack = error.stack;
    }
    this.code = code ?? ERROR_CODE.UNKNOWN_ERROR;
    this.errorMessage = message;
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
