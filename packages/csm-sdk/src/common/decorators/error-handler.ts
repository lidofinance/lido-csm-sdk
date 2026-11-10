import { callConsoleMessage } from './utils';
import { type HeadMessage } from './types';
import {
  TransactionCallback,
  TransactionCallbackStage,
} from '../../tx-sdk/types';
import { SDKError } from '../index';

// First-fire-wins marker. When @ErrorHandler is nested (e.g. tx-sdk's
// perform() inside a gate SDK method), only the innermost layer notifies the
// user via the ERROR callback. Outer layers still log + ensure SDKError
// wrapping, but skip duplicate callback firing. WeakSet avoids mutating the
// error object and allows GC when the error is no longer referenced.
const notifiedErrors = new WeakSet<SDKError>();

// Same first-fire-wins rule for the console line: only the innermost layer prints.
const loggedErrors = new WeakSet<SDKError>();

const notifyOnce = (
  error: SDKError,
  callback: TransactionCallback | undefined,
): void => {
  if (!callback) return;
  if (notifiedErrors.has(error)) return;
  notifiedErrors.add(error);
  void callback({
    stage: TransactionCallbackStage.ERROR,
    payload: { error },
  });
};

const logOnce = (
  self: unknown,
  error: SDKError,
  headMessage: HeadMessage,
  message: string,
): void => {
  if (loggedErrors.has(error)) return;
  loggedErrors.add(error);
  callConsoleMessage.call(self, headMessage, message, 'Error:');
};

export const ErrorHandler = function (
  headMessage: HeadMessage = 'Error:',
  options: { notify?: boolean } = {},
) {
  const { notify = true } = options;

  return function ErrorHandlerDecorator<This, Value>(
    target:
      | (This extends object ? This[keyof This] : never)
      | ((this: This, ...args: any[]) => Value),
    context:
      | ClassMethodDecoratorContext<This, any>
      | ClassGetterDecoratorContext<This, Value>,
  ) {
    const methodName = String(context.name);

    if (context.kind === 'getter') {
      const replacementGetter = function (this: This): Value {
        const fail = (error: unknown): never => {
          const txError = SDKError.from(error);
          logOnce(
            this,
            txError,
            headMessage,
            `Error in getter '${methodName}'.`,
          );
          throw txError;
        };

        try {
          const result = (target as () => Value).call(this);

          return result instanceof Promise
            ? (result.catch(fail) as Value)
            : result;
        } catch (error) {
          return fail(error);
        }
      };

      return replacementGetter as any;
    }

    const replacementMethod = function (this: This, ...args: any[]): any {
      const callback = notify
        ? (args[0]?.callback as TransactionCallback | undefined)
        : undefined;

      const fail = (error: unknown): never => {
        const txError = SDKError.from(error);
        logOnce(this, txError, headMessage, `Error in method '${methodName}'.`);
        notifyOnce(txError, callback);
        throw txError;
      };

      try {
        const result = (target as (...args: any[]) => any).call(this, ...args);

        return result instanceof Promise ? result.catch(fail) : result;
      } catch (error) {
        return fail(error);
      }
    };
    return replacementMethod;
  };
};
