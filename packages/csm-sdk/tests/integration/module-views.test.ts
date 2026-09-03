import { describe, expect, it } from 'vitest';
import { useCsmSdk, usePublicClient } from '../helpers';

describe('integration: module views (read-only)', () => {
  it('publicClient is connected to the anvil fork', async () => {
    const block = await usePublicClient().getBlockNumber();
    expect(block).toBeGreaterThan(0n);
  });

  it('module.getOperatorsCount returns a non-negative count', async () => {
    const sdk = useCsmSdk();
    const count = await sdk.module.getOperatorsCount();
    expect(typeof count).toBe('bigint');
    expect(count).toBeGreaterThanOrEqual(0n);
  });

  it('module.getStatus returns pause flags as booleans', async () => {
    const sdk = useCsmSdk();
    const status = await sdk.module.getStatus();
    // Type-only: the chosen fork block could legitimately be paused (planned
    // maintenance, emergency pause). The test's intent — per its name — is to
    // verify the SDK surfaces the flags as booleans, not pin a chain value.
    expect(typeof status.isPausedModule).toBe('boolean');
    expect(typeof status.isPausedAccounting).toBe('boolean');
  });

  it('module.getRegistration reports CSM as registered and active on hoodi', async () => {
    const sdk = useCsmSdk();
    const registration = await sdk.module.getRegistration();
    expect(registration).toEqual({
      registered: true,
      isActive: true,
    });
  });
});
