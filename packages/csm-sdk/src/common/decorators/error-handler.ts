import { callConsoleMessage } from './utils.js';
import { type HeadMessage } from './types.js';
import { SDKError } from '@lidofinance/lido-ethereum-sdk';

export const ErrorHandler = function (headMessage: HeadMessage = 'Error:') {
  return function ErrorHandlerDecorator<This, Value>(
    target: (This extends object ? This[keyof This] : never) | ((this: This, ...args: any[]) => Value),
    context: ClassMethodDecoratorContext<This, any> | ClassGetterDecoratorContext<This, Value>,
  ) {
    const methodName = String(context.name);

    if (context.kind === 'getter') {
      const replacementGetter = function (this: This): Value {
        try {
          const result = (target as () => Value).call(this);

          if (result instanceof Promise) {
            return result.catch((error) => {
              callConsoleMessage.call(
                this,
                headMessage,
                `Error in getter '${methodName}'.`,
                'Error:',
              );

              const txError = SDKError.from(error);
              throw txError;
            }) as Value;
          } else {
            return result;
          }
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
      const callback = args[0]?.callback;

      try {
        const result = (target as (...args: any[]) => any).call(this, ...args);

        if (result instanceof Promise) {
          return result.catch((error) => {
            callConsoleMessage.call(
              this,
              headMessage,
              `Error in method '${methodName}'.`,
              'Error:',
            );

            const txError = SDKError.from(error);
            callback?.({ stage: 'error', payload: txError });

            throw txError;
          }) as any;
        } else {
          return result;
        }
      } catch (error) {
        callConsoleMessage.call(
          this,
          headMessage,
          `Error in method '${methodName}'.`,
          'Error:',
        );

        const txError = SDKError.from(error);
        callback?.({ stage: 'error', payload: txError });

        throw txError;
      }
    };
    return replacementMethod;
  };
};
