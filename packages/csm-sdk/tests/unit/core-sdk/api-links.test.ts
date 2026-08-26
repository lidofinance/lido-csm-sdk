import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { describe, expect, it } from 'vitest';
import { API_NAME, API_URLS } from '../../../src/common/constants/links';
import { CoreSDK } from '../../../src/core-sdk/core-sdk';

const makeCore = (props: {
  keysApiUrl?: string;
  feesMonitoringApiUrl?: string;
}) =>
  new CoreSDK({
    core: { chain: { id: CHAINS.Hoodi } },
    ...props,
  } as any);

const defaults = API_URLS[CHAINS.Hoodi];

describe('CoreSDK.keysApiLink', () => {
  it('falls back to the chain default when the url is an empty string', () => {
    expect(makeCore({ keysApiUrl: '' }).keysApiLink).toBe(
      defaults[API_NAME.keys],
    );
  });

  it('falls back to the chain default when the url is unset', () => {
    expect(makeCore({}).keysApiLink).toBe(defaults[API_NAME.keys]);
  });

  it('prefers an explicitly configured url', () => {
    expect(makeCore({ keysApiUrl: 'https://keys.example' }).keysApiLink).toBe(
      'https://keys.example',
    );
  });
});

describe('CoreSDK.feesMonitoringApiLink', () => {
  it('falls back to the chain default when the url is an empty string', () => {
    expect(makeCore({ feesMonitoringApiUrl: '' }).feesMonitoringApiLink).toBe(
      defaults[API_NAME.feesMonitoring],
    );
  });

  it('falls back to the chain default when the url is unset', () => {
    expect(makeCore({}).feesMonitoringApiLink).toBe(
      defaults[API_NAME.feesMonitoring],
    );
  });

  it('prefers an explicitly configured url', () => {
    expect(
      makeCore({ feesMonitoringApiUrl: 'https://fees.example' })
        .feesMonitoringApiLink,
    ).toBe('https://fees.example');
  });
});
