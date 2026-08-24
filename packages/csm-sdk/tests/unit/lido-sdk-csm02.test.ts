import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { LidoSDKCsm02 } from '../../src/lido-sdk-csm02';
import { SDKError } from '../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../src/common/utils/sdk-error-code';

// CSM 0x02 is deployed on Hoodi but not Mainnet yet, so MODULE_CONFIG[CSM_02]
// only has a Hoodi entry. `prepareCoreProps` guards on the missing chain
// before any RPC call is made (see
// docs/superpowers/specs/2026-07-21-csm-0x02-module-design.md).
describe('LidoSDKCsm02', () => {
  const makeCore = (chainId: CHAINS) =>
    new LidoSDKCore({ chainId, rpcUrls: ['http://localhost:8545'] });

  it('throws SDKError NOT_SUPPORTED on Mainnet, since it is not deployed yet', () => {
    const core = makeCore(CHAINS.Mainnet);

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
    expect(error.message).toContain(String(CHAINS.Mainnet));
  });

  it('constructs on Hoodi with only the permissionless gate wired', () => {
    const core = makeCore(CHAINS.Hoodi);

    const sdk = new LidoSDKCsm02({ core });

    expect(sdk.permissionlessGate).toBeDefined();
    expect('icsGate' in sdk).toBe(false);
    expect('idvtcGate' in sdk).toBe(false);
    expect(sdk.core.moduleId).toBe(6n);
  });
});
