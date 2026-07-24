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

export const ErrorHandler = function (headMessage: HeadMessage = 'Error:') {
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
        try {
          const result = (target as () => Value).call(this);

          return result instanceof Promise
            ? (result.catch((error) => {
                callConsoleMessage.call(
                  this,
                  headMessage,
                  `Error in getter '${methodName}'.`,
                  'Error:',
                );

                const txError = SDKError.from(error);
                throw txError;
              }) as Value)
            : result;
        } catch (error) {
          callConsoleMessage.call(
            this,
            headMessage,
            `Error in getter '${methodName}'.`,
            'Error:',
          );

          const txError = SDKError.from(error);
          throw txError;
        }
      };

      return replacementGetter as any;
    }

    const replacementMethod = function (this: This, ...args: any[]): any {
      const callback = args[0]?.callback as TransactionCallback | undefined;

      try {
        const result = (target as (...args: any[]) => any).call(this, ...args);

        return result instanceof Promise
          ? (result.catch((error) => {
              callConsoleMessage.call(
                this,
                headMessage,
                `Error in method '${methodName}'.`,
                'Error:',
              );

              const txError = SDKError.from(error);
              notifyOnce(txError, callback);

              throw txError;
            }) as any)
          : result;
      } catch (error) {
        callConsoleMessage.call(
          this,
          headMessage,
          `Error in method '${methodName}'.`,
          'Error:',
        );

        const txError = SDKError.from(error);
        notifyOnce(txError, callback);

        throw txError;
      }
    };
    return replacementMethod;
  };
};
