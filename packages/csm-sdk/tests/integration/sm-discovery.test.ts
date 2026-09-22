import { describe, expect, it } from 'vitest';
import { MODULE_NAME } from '../../src/common';
import { useSmSdk } from '../helpers';

// SMDiscovery's by-address scans time out over a forked eth_call for every
// module (CSM has thousands of operators; CM/CSM_02 are slow too), so the
// fan-out equality check lives in tests/unit/lido-sdk-sm.test.ts.
describe('integration: LidoSmSDK (read-only)', () => {
  it('constructs every module deployed on hoodi', () => {
    expect(useSmSdk().moduleNames).toEqual([
      MODULE_NAME.CSM,
      MODULE_NAME.CM,
      MODULE_NAME.CSM_02,
    ]);
  });

  it('each module core is bound to its own moduleId and reads live', async () => {
    const sm = useSmSdk();
    const ids = new Set<bigint>();
    for (const [module, sdk] of sm.modules) {
      expect(sdk.core.moduleName).toBe(module);
      ids.add(sdk.core.moduleId);
      const count = await sdk.module.getOperatorsCount();
      expect(count).toBeGreaterThanOrEqual(0n);
    }
    expect(ids.size).toBe(sm.modules.size);
  });
});
