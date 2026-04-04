import type { MethodAccess } from './access-types.js';

export const ACCESS = Symbol('access');

export const Access = function (access: MethodAccess) {
  return function AccessDecorator<This, Args extends any[], Return>(
    target: (this: This, ...args: Args) => Return,
    _context: ClassMethodDecoratorContext<This>,
  ) {
    (target as any)[ACCESS] = Object.freeze(access);
    return target;
  };
};
