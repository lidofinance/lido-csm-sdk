import { callConsoleMessage } from './utils.js';
import { type HeadMessage } from './types.js';
import { SDKError } from '@lidofinance/lido-ethereum-sdk';
import {
  TransactionCallback,
  TransactionCallbackStage,
} from '../../tx-sdk/types.js';

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
              // eslint-disable-next-line promise/no-callback-in-promise
              void callback?.({
                stage: TransactionCallbackStage.ERROR,
                payload: { error: txError },
              });

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
        void callback?.({
          stage: TransactionCallbackStage.ERROR,
          payload: { error: txError },
        });

        throw txError;
      }
    };
    return replacementMethod;
  };
};
