import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_IPFS_GATEWAYS } from '../../../src/common/constants/links';
import { MODULE_NAME } from '../../../src/common/constants/module-name';
import { CoreSDK } from '../../../src/core-sdk/core-sdk';
import { resolveDeployment } from '../../../src/core-sdk/resolve-deployment';

const CID = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';
const NORMALIZED_CID =
  'bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq';

const makeCore = (ipfsGateways?: string[]) =>
  new CoreSDK({
    core: { chain: { id: CHAINS.Hoodi } },
    ...resolveDeployment({
      moduleName: MODULE_NAME.CSM,
      chainId: CHAINS.Hoodi,
    }),
    ipfsGateways,
  } as any);

describe('CoreSDK.getIpfsUrls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty array for an invalid CID', () => {
    expect(makeCore().getIpfsUrls('not-a-cid')).toEqual([]);
  });

  it('puts configured gateways first, in order', () => {
    const configured = [
      'https://a.example/ipfs/{cid}',
      'https://b.example/{cid}',
    ];
    const urls = makeCore(configured).getIpfsUrls(CID);
    expect(urls.slice(0, 2)).toEqual([
      `https://a.example/ipfs/${NORMALIZED_CID}`,
      `https://b.example/${NORMALIZED_CID}`,
    ]);
  });

  it('includes exactly the default gateways as the remainder', () => {
    const configured = ['https://a.example/ipfs/{cid}'];
    const urls = makeCore(configured).getIpfsUrls(CID);
    const remainder = urls.slice(configured.length);
    const expected = DEFAULT_IPFS_GATEWAYS.map((g) =>
      g.replace('{cid}', NORMALIZED_CID),
    );
    expect(remainder).toHaveLength(DEFAULT_IPFS_GATEWAYS.length);
    expect(new Set(remainder)).toEqual(new Set(expected));
  });

  it('shuffles the default gateway order between calls', () => {
    const spy = vi.spyOn(Math, 'random');
    spy.mockReturnValue(0);
    const first = makeCore().getIpfsUrls(CID);
    spy.mockReturnValue(0.99);
    const second = makeCore().getIpfsUrls(CID);
    expect(first).not.toEqual(second);
  });
});
