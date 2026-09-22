import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { MODULE_NAME } from '../../src/common/constants/module-name';
import { SDKError } from '../../src/common/utils/sdk-error';
import { ERROR_CODE } from '../../src/common/utils/sdk-error-code';
import { LidoSDKCm } from '../../src/lido-sdk-cm';
import { LidoSDKCsm } from '../../src/lido-sdk-csm';
import { LidoSDKCsm02 } from '../../src/lido-sdk-csm02';
import { LidoSmSDK } from '../../src/sm-sdk/lido-sdk-sm';

const makeCore = (chainId: CHAINS) =>
  new LidoSDKCore({ chainId, rpcUrls: ['http://localhost:8545'] });

const catchError = (fn: () => unknown): SDKError => {
  try {
    fn();
  } catch (e) {
    return e as SDKError;
  }
  throw new Error('expected throw');
};

describe('LidoSmSDK', () => {
  it('defaults to every module deployed on the chain, in MODULE_NAME order', () => {
    expect(new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) }).moduleNames).toEqual(
      [MODULE_NAME.CSM, MODULE_NAME.CM, MODULE_NAME.CSM_02],
    );
    expect(
      new LidoSmSDK({ core: makeCore(CHAINS.Mainnet) }).moduleNames,
    ).toEqual([MODULE_NAME.CSM, MODULE_NAME.CM]);
  });

  it('throws NOT_SUPPORTED when an explicitly requested module is not deployed', () => {
    const error = catchError(
      () =>
        new LidoSmSDK({
          core: makeCore(CHAINS.Mainnet),
          modules: [MODULE_NAME.CSM_02],
        }),
    );
    expect(error).toBeInstanceOf(SDKError);
    expect(error.code).toBe(ERROR_CODE.NOT_SUPPORTED);
    expect(error.message).toContain('CSM_02');
  });

  it('get() narrows by module and returns undefined for absent modules', () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Mainnet) });
    expect(sdk.get(MODULE_NAME.CSM)).toBeInstanceOf(LidoSDKCsm);
    expect(sdk.get(MODULE_NAME.CM)).toBeInstanceOf(LidoSDKCm);
    expect(sdk.get(MODULE_NAME.CSM_02)).toBeUndefined();
    expect(sdk.csm).toBe(sdk.get(MODULE_NAME.CSM));
    expect(sdk.cm).toBe(sdk.get(MODULE_NAME.CM));
    expect(sdk.csm02).toBeUndefined();
    expectTypeOf(sdk.get(MODULE_NAME.CM)).toEqualTypeOf<
      LidoSDKCm | undefined
    >();
    expectTypeOf(sdk.get(MODULE_NAME.CSM_02)).toEqualTypeOf<
      LidoSDKCsm02 | undefined
    >();
  });

  it('require() throws NOT_SUPPORTED naming module and chain', () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Mainnet) });
    expect(sdk.require(MODULE_NAME.CSM)).toBeInstanceOf(LidoSDKCsm);
    const error = catchError(() => sdk.require(MODULE_NAME.CSM_02));
    expect(error.code).toBe(ERROR_CODE.NOT_SUPPORTED);
    expect(error.message).toBe(
      `CSM_02 is not available on chain ${CHAINS.Mainnet}`,
    );
  });

  it('shares keysCache, wallet and allowance across every module', () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });
    const all = [...sdk.modules.values()];
    for (const m of all) {
      expect(m.keysCache).toBe(sdk.keysCache);
      expect(m.tx.bus.wallet).toBe(sdk.wallet);
      expect(m.tx.bus.allowance).toBe(sdk.allowance);
      expect(m.depositData.bus.get('keysCache' as never)).toBe(sdk.keysCache);
    }
  });

  it('each module core reports its own moduleName and moduleId', () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });
    expect(sdk.csm!.core.moduleName).toBe(MODULE_NAME.CSM);
    expect(sdk.csm!.core.moduleId).toBe(4n);
    expect(sdk.cm!.core.moduleName).toBe(MODULE_NAME.CM);
    expect(sdk.cm!.core.moduleId).toBe(5n);
    expect(sdk.csm02!.core.moduleId).toBe(6n);
  });

  it('respects an explicit module subset and order', () => {
    const sdk = new LidoSmSDK({
      core: makeCore(CHAINS.Hoodi),
      modules: [MODULE_NAME.CM],
    });
    expect(sdk.moduleNames).toEqual([MODULE_NAME.CM]);
    expect(sdk.csm).toBeUndefined();
    expect(sdk.keysCache).toBe(sdk.cm!.keysCache);
  });

  it('throws NOT_SUPPORTED when modules is an empty list', () => {
    const error = catchError(
      () => new LidoSmSDK({ core: makeCore(CHAINS.Hoodi), modules: [] }),
    );
    expect(error).toBeInstanceOf(SDKError);
    expect(error.code).toBe(ERROR_CODE.NOT_SUPPORTED);
  });

  it('de-duplicates repeated module names', () => {
    const sdk = new LidoSmSDK({
      core: makeCore(CHAINS.Hoodi),
      modules: [MODULE_NAME.CM, MODULE_NAME.CM],
    });
    expect(sdk.moduleNames).toEqual([MODULE_NAME.CM]);
  });
});

describe('SmDiscoverySDK', () => {
  it('fans out to every module and tags results with the module name', async () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });
    const address = '0x1111111111111111111111111111111111111111';
    const op = (id: bigint) => ({ nodeOperatorId: id }) as never;
    vi.spyOn(sdk.csm!.discovery, 'getNodeOperatorsByAddress').mockResolvedValue(
      [op(1n)],
    );
    vi.spyOn(sdk.cm!.discovery, 'getNodeOperatorsByAddress').mockResolvedValue(
      [],
    );
    vi.spyOn(
      sdk.csm02!.discovery,
      'getNodeOperatorsByAddress',
    ).mockResolvedValue([op(7n), op(8n)]);

    const refs = await sdk.discovery.getNodeOperatorsByAddress(address);

    expect(refs).toEqual([
      { module: MODULE_NAME.CSM, operator: op(1n) },
      { module: MODULE_NAME.CSM_02, operator: op(7n) },
      { module: MODULE_NAME.CSM_02, operator: op(8n) },
    ]);
    expect(sdk.cm!.discovery.getNodeOperatorsByAddress).toHaveBeenCalledWith(
      address,
    );
  });
});
