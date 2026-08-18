import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { LidoSDKCsm02 } from '../../src/lido-sdk-csm02';
import { SDKError } from '../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../src/common/utils/sdk-error-code';

// CSM 0x02 has not been deployed on any network yet, so MODULE_CONFIG[CSM_02]
// is empty for every supported chain. `prepareCoreProps` guards on that
// before any RPC call is made, so construction must fail fast and
// deterministically — this is the concrete behavioral guarantee we can
// assert today (see docs/superpowers/specs/2026-07-21-csm-0x02-module-design.md).
describe('LidoSDKCsm02', () => {
  const makeCore = (chainId: CHAINS) =>
    new LidoSDKCore({ chainId, rpcUrls: ['http://localhost:8545'] });

  it.each([
    ['Mainnet', CHAINS.Mainnet],
    ['Hoodi', CHAINS.Hoodi],
  ])(
    'throws SDKError NOT_SUPPORTED on %s, since it is not deployed yet',
    (_label, chainId) => {
      const core = makeCore(chainId);

      let thrown: unknown;
      try {
        new LidoSDKCsm02({ core });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(SDKError);
      const error = thrown as SDKError;
      expect(error.code).toBe(ERROR_CODE.NOT_SUPPORTED);
      expect(error.message).toContain('CSM_02');
      expect(error.message).toContain(String(chainId));
    },
  );
});
