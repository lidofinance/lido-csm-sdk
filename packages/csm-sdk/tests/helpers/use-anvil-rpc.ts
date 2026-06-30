import { inject } from 'vitest';

// Anvil endpoint is published by global-setup via TestProject.provide().
// Reading it through inject() means the value travels through Vitest's
// official cross-process contract — pool changes, isolation flips, and
// future Vitest upgrades won't silently break the wiring the way a
// process.env-based hand-off could.

export const anvilRpcUrl = (): string => {
  const value = inject('anvilRpcUrl');
  if (!value) {
    throw new TypeError(
      'anvilRpcUrl not provided. Run integration tests via "yarn test:integration" so global-setup boots anvil.',
    );
  }
  return value;
};

export const anvilChainId = (): number => {
  const value = inject('anvilChainId');
  if (typeof value !== 'number') {
    throw new TypeError(
      'anvilChainId not provided. Run integration tests via "yarn test:integration" so global-setup boots anvil.',
    );
  }
  return value;
};
