import { Dedupe } from './dedupe';
import { ErrorHandler } from './error-handler';
import { Logger } from './logger';

/** View decorator for `estimate*` methods; the dedupe key includes the wallet account so an omitted `account` prop can't share across accounts. */
export const EstimateView = function () {
  const logger = Logger('Views:');
  const errorHandler = ErrorHandler('Error:', { notify: false });
  const dedupe = Dedupe(['defaultAccountAddress']);

  return function EstimateViewDecorator<This extends object>(
    target: (this: This, ...args: any[]) => Promise<any>,
    context: ClassMethodDecoratorContext<This, any>,
  ) {
    return logger(errorHandler(dedupe(target, context), context), context);
  };
};
