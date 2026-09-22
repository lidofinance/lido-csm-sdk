import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { LidoSDKCm } from '../../src/lido-sdk-cm';
import { LidoSDKCsm } from '../../src/lido-sdk-csm';
import { LidoSDKCsm02 } from '../../src/lido-sdk-csm02';
import { StakingModuleSDK } from '../../src/sm-sdk/staking-module-sdk';
import { KeysCacheSDK } from '../../src/keys-cache-sdk/keys-cache-sdk';

const makeCore = () =>
  new LidoSDKCore({
    chainId: CHAINS.Hoodi,
    rpcUrls: ['http://localhost:8545'],
  });

const COMMON_FIELDS = [
  'core',
  'tx',
  'module',
  'accounting',
  'parameters',
  'operator',
  'rewards',
  'keys',
  'keysWithStatus',
  'keysCache',
  'bond',
  'roles',
  'events',
  'frame',
  'depositData',
  'delayedPenalty',
  'discovery',
  'feesMonitoring',
] as const;

describe('StakingModuleSDK subclasses', () => {
  it.each([
    ['LidoSDKCsm', () => new LidoSDKCsm({ core: makeCore() })],
    ['LidoSDKCsm02', () => new LidoSDKCsm02({ core: makeCore() })],
    ['LidoSDKCm', () => new LidoSDKCm({ core: makeCore() })],
  ])(
    '%s extends StakingModuleSDK and wires every common module',
    (_, build) => {
      const sdk = build();
      expect(sdk).toBeInstanceOf(StakingModuleSDK);
      for (const field of COMMON_FIELDS) expect(sdk[field]).toBeDefined();
    },
  );

  it('LidoSDKCsm has CSM extras and no CM extras', () => {
    const sdk = new LidoSDKCsm({ core: makeCore() });
    expect(sdk.permissionlessGate).toBeDefined();
    expect(sdk.icsGate).toBeDefined();
    expect(sdk.idvtcGate).toBeDefined();
    expect(sdk.strikes).toBeDefined();
    expect(sdk.depositQueue).toBeDefined();
    expect('curatedGates' in sdk).toBe(false);
    expect('metaRegistry' in sdk).toBe(false);
  });

  it('LidoSDKCm has CM extras and no CSM extras', () => {
    const sdk = new LidoSDKCm({ core: makeCore() });
    expect(sdk.curatedGates).toBeDefined();
    expect(sdk.metaRegistry).toBeDefined();
    expect('strikes' in sdk).toBe(false);
    expect('depositQueue' in sdk).toBe(false);
    expect('permissionlessGate' in sdk).toBe(false);
  });

  it('registers module-specific SDKs on the bus so common modules can reach them', () => {
    const csm = new LidoSDKCsm({ core: makeCore() });
    expect(csm.bond.bus.get('strikes' as never)).toBe(csm.strikes);
    expect(csm.bond.bus.get('depositQueue' as never)).toBe(csm.depositQueue);
    const cm = new LidoSDKCm({ core: makeCore() });
    expect(cm.bond.bus.get('strikes' as never)).toBeUndefined();
  });

  it('accepts a shared keysCache and registers it on the bus', () => {
    const first = new LidoSDKCsm({ core: makeCore() });
    const second = new LidoSDKCm(
      { core: makeCore() },
      {
        keysCache: first.keysCache,
        wallet: first.tx.bus.wallet,
        allowance: first.tx.bus.allowance,
      },
    );
    expect(second.keysCache).toBe(first.keysCache);
    expect(second.keysCache).toBeInstanceOf(KeysCacheSDK);
    expect(second.depositData.bus.get('keysCache' as never)).toBe(
      first.keysCache,
    );
  });

  it('accepts shared wallet and allowance and hands them to tx', () => {
    const first = new LidoSDKCsm({ core: makeCore() });
    const shared = {
      wallet: first.tx.bus.wallet,
      allowance: first.tx.bus.allowance,
      keysCache: first.keysCache,
    };
    const second = new LidoSDKCm({ core: makeCore() }, shared);
    expect(second.tx.bus.wallet).toBe(first.tx.bus.wallet);
    expect(second.tx.bus.allowance).toBe(first.tx.bus.allowance);
  });
});
