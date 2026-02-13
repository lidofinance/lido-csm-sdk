import { callConsoleMessage } from './utils.js';
import { type HeadMessage } from './types.js';

export const Logger = function (headMessage: HeadMessage = 'LOG:') {
  return function LoggerDecorator<This, Value>(
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
        if (headMessage === 'Deprecation:')
          callConsoleMessage.call(
            this,
            headMessage,
            `Getter '${methodName}' is being deprecated in the next major version`,
          );

        callConsoleMessage.call(
          this,
          headMessage,
          `Accessing getter '${methodName}'.`,
        );
        const result = (target as () => Value).call(this);

        if (result instanceof Promise) {
          return result
            .then((resolvedResult) => {
              callConsoleMessage.call(
                this,
                headMessage,
                `Getter '${methodName}' resolved.`,
              );
              return resolvedResult;
            })
            .catch((error) => {
              callConsoleMessage.call(
                this,
                headMessage,
                `Getter '${methodName}' rejected with error.`,
                'Error:',
              );
              throw error;
            }) as Value;
        } else {
          callConsoleMessage.call(
            this,
            headMessage,
            `Getter '${methodName}' accessed.`,
          );
          return result;
        }
      };

      return replacementGetter as any;
    }

    const replacementMethod = function (this: This, ...args: any[]): any {
      if (headMessage === 'Deprecation:')
        callConsoleMessage.call(
          this,
          headMessage,
          `Method '${methodName}' is being deprecated in the next major version`,
        );

      callConsoleMessage.call(
        this,
        headMessage,
        `Entering method '${methodName}'.`,
      );
      const result = (target as (...args: any[]) => any).call(this, ...args);

      if (result instanceof Promise) {
        return result
          .then((resolvedResult) => {
            callConsoleMessage.call(
              this,
              headMessage,
              `Exiting method '${methodName}'.`,
            );
            return resolvedResult;
          })
          .catch((error) => {
            callConsoleMessage.call(
              this,
              headMessage,
              `Exiting method '${methodName}' with error.`,
              'Error:',
            );
            throw error;
          }) as any;
      } else {
        callConsoleMessage.call(
          this,
          headMessage,
          `Exiting method '${methodName}'.`,
        );
        return result;
      }
    };

    return replacementMethod;
  };
};
