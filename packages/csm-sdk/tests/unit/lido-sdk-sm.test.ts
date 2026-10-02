import { CHAINS, LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { BaseError, ContractFunctionRevertedError } from 'viem';
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
  it('defaults to every module deployed on the chain, in canonical order', () => {
    expect(new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) }).moduleNames).toEqual(
      [MODULE_NAME.CSM, MODULE_NAME.CSM_02, MODULE_NAME.CM],
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
  const address = '0x1111111111111111111111111111111111111111';
  const op = (id: bigint) => ({ nodeOperatorId: id }) as never;
  const errors = {
    csm: new Error('csm down'),
    csm02: new Error('csm02 down'),
    cm: new Error('cm down'),
  };

  type Method =
    'getNodeOperatorsByAddress' | 'getNodeOperatorsByProposedAddress';
  type Mock = unknown[] | Error;

  const mockDiscovery = (
    sdk: LidoSmSDK,
    method: Method,
    mocks: { csm: Mock; csm02: Mock; cm: Mock },
  ) => {
    const targets = { csm: sdk.csm!, csm02: sdk.csm02!, cm: sdk.cm! };
    for (const key of ['csm', 'csm02', 'cm'] as const) {
      const spy = vi.spyOn(targets[key].discovery, method);
      const mock = mocks[key];
      if (mock instanceof Error) spy.mockRejectedValue(mock);
      else spy.mockResolvedValue(mock as never);
    }
  };

  it('fans out to every module and tags results with the module name', async () => {
    const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });
    mockDiscovery(sdk, 'getNodeOperatorsByAddress', {
      csm: [op(1n)],
      csm02: [op(7n), op(8n)],
      cm: [],
    });

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

  describe('partial failure', () => {
    const setup = () => new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });

    it('resolves the other modules and reports the failed one', async () => {
      const sdk = setup();
      mockDiscovery(sdk, 'getNodeOperatorsByAddress', {
        csm: [op(1n)],
        csm02: errors.csm02,
        cm: [op(5n)],
      });
      const onModuleError = vi.fn();

      const refs = await sdk.discovery.getNodeOperatorsByAddress(address, {
        onModuleError,
      });

      expect(refs).toEqual([
        { module: MODULE_NAME.CSM, operator: op(1n) },
        { module: MODULE_NAME.CM, operator: op(5n) },
      ]);
      expect(onModuleError).toHaveBeenCalledTimes(1);
      expect(onModuleError).toHaveBeenCalledWith(
        MODULE_NAME.CSM_02,
        errors.csm02,
      );
    });

    it('still resolves partial results without options', async () => {
      const sdk = setup();
      mockDiscovery(sdk, 'getNodeOperatorsByAddress', {
        csm: errors.csm,
        csm02: [op(7n)],
        cm: [],
      });

      await expect(
        sdk.discovery.getNodeOperatorsByAddress(address),
      ).resolves.toEqual([{ module: MODULE_NAME.CSM_02, operator: op(7n) }]);
    });

    it('rejects with the first module error when all fail', async () => {
      const sdk = setup();
      mockDiscovery(sdk, 'getNodeOperatorsByAddress', errors);
      const onModuleError = vi.fn();

      await expect(
        sdk.discovery.getNodeOperatorsByAddress(address, { onModuleError }),
      ).rejects.toBe(errors.csm);
      expect(onModuleError).not.toHaveBeenCalled();
    });

    it('getNodeOperatorsByProposedAddress has the same partial semantics', async () => {
      const sdk = setup();
      const invite = { id: 1n } as never;
      mockDiscovery(sdk, 'getNodeOperatorsByProposedAddress', {
        csm: [invite],
        csm02: [],
        cm: errors.cm,
      });
      const onModuleError = vi.fn();

      const refs = await sdk.discovery.getNodeOperatorsByProposedAddress(
        address,
        { onModuleError },
      );

      expect(refs).toEqual([{ module: MODULE_NAME.CSM, invite }]);
      expect(onModuleError).toHaveBeenCalledWith(MODULE_NAME.CM, errors.cm);

      mockDiscovery(sdk, 'getNodeOperatorsByProposedAddress', errors);
      await expect(
        sdk.discovery.getNodeOperatorsByProposedAddress(address),
      ).rejects.toBe(errors.csm);
    });
  });

  describe('real DiscoverySDK revert', () => {
    it('reports a module whose discovery read reverts via onModuleError', async () => {
      const sdk = new LidoSmSDK({ core: makeCore(CHAINS.Hoodi) });
      const reverted = new BaseError('call failed', {
        cause: new ContractFunctionRevertedError({
          abi: [],
          functionName: 'getNodeOperatorsByAddress',
          message: 'ModuleCacheNotInitialized',
        }),
      });
      const failing = sdk.cm!;
      for (const m of sdk.modules.values()) {
        vi.spyOn(m.module, 'getOperatorsCount').mockResolvedValue(1n);
        const read = () =>
          m === failing ? Promise.reject(reverted) : Promise.resolve([]);
        vi.spyOn(m.discovery.core, 'getContract').mockReturnValue({
          read: { getNodeOperatorsByAddress: read },
        } as never);
      }
      const onModuleError = vi.fn();

      const refs = await sdk.discovery.getNodeOperatorsByAddress(address, {
        onModuleError,
      });

      expect(refs).toEqual([]);
      expect(onModuleError).toHaveBeenCalledTimes(1);
      expect(onModuleError).toHaveBeenCalledWith(
        MODULE_NAME.CM,
        expect.any(SDKError),
      );
    });
  });
});
