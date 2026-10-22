import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { LidoSDKCsm02 } from '../../src/lido-sdk-csm02';

describe('LidoSDKCsm02', () => {
  const makeCore = (chainId: CHAINS) =>
    new LidoSDKCore({ chainId, rpcUrls: ['http://localhost:8545'] });

  it('constructs on Mainnet with only the permissionless gate wired', () => {
    const core = makeCore(CHAINS.Mainnet);

    const sdk = new LidoSDKCsm02({ core });

    expect(sdk.permissionlessGate).toBeDefined();
    expect('icsGate' in sdk).toBe(false);
    expect('idvtcGate' in sdk).toBe(false);
    expect(sdk.core.moduleId).toBe(5n);
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
