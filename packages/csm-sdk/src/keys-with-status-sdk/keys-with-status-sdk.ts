import { Hex, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CACHE_MID,
  EJECTABLE_EPOCH_COUNT,
  MAX_BLOCKS_DEPTH_TWO_WEEKS,
} from '../common/index.js';
import { NodeOperatorId } from '../common/types.js';
import { fetchJson, isNotUnique, isUnique } from '../common/utils/index.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { FrameSDK } from '../frame-sdk/frame-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { StrikesSDK } from '../strikes-sdk/strikes-sdk.js';
import { getClUrls, prepareKey } from './cl-chunks.js';
import { computeStatuses } from './compute-statuses.js';
import {
  ClPreparedKey,
  ClValidatorsResponse,
  FindKeysResponse,
  KeyWithStatus,
} from './types.js';

export class KeysWithStatusSDK extends CsmSDKModule<{
  operator: OperatorSDK;
  frame: FrameSDK;
  events: EventsSDK;
  strikes?: StrikesSDK;
}> {
  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getApiKeys(pubkeys: Hex[]) {
    const keysApi = this.core.keysApiLink;

    if (!keysApi) {
      throw new Error('Keys API link is not configured');
    }

    if (pubkeys.length === 0) return [];

    const url = `${keysApi}/v1/keys/find`;

    const response = await fetchJson<FindKeysResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ pubkeys }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (!response) return null;

    return response.data;
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getApiKeysDuplicates(
    nodeOperatorId: NodeOperatorId,
  ): Promise<Hex[] | null> {
    const pubkeys = await this.bus.operator.getKeys(nodeOperatorId);

    const keys = await this.getApiKeys(pubkeys);
    if (!keys) return null;

    const moduleAddress = this.core.getContractAddress(this.core.moduleName);

    const duplicates = [
      ...keys.map(({ key }) => key).filter(isNotUnique),
      ...keys
        .filter(
          (key) =>
            key.operatorIndex !== Number(nodeOperatorId) ||
            !isAddressEqual(key.moduleAddress, moduleAddress),
        )
        .map(({ key }) => key),
    ].filter(isUnique);

    return duplicates;
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getClKeys(pubkeys: Hex[]): Promise<ClPreparedKey[] | null> {
    if (!this.core.clApiUrl || pubkeys.length === 0) {
      return null;
    }

    const urls = getClUrls(pubkeys, this.core.clApiUrl);
    const results = await Promise.all(
      urls.map((url) => fetchJson<ClValidatorsResponse>(url)),
    );

    return results.flatMap(({ data }) => data?.map(prepareKey));
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getClKeysStatus(
    nodeOperatorId: NodeOperatorId,
  ): Promise<ClPreparedKey[] | null> {
    const pubkeys = await this.bus.operator.getKeys(nodeOperatorId);
    return this.getClKeys(pubkeys);
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getKeys(id: NodeOperatorId): Promise<KeyWithStatus[]> {
    const [info, unboundCount, keys, currentEpoch] = await Promise.all([
      this.bus.operator.getInfo(id),
      this.bus.operator.getUnboundKeysCount(id),
      this.bus.operator.getKeys(id),
      this.bus.frame.getCurrentEpoch(),
    ]);
    const [
      withdrawalSubmitted,
      requestedToExit,
      duplicates,
      clKeysStatus,
      keysWithStrikes,
    ] = await Promise.all([
      this.bus.events.getWithdrawalSubmittedKeys(id, {
        maxBlocksDepth: MAX_BLOCKS_DEPTH_TWO_WEEKS,
      }),
      this.bus.events.getRequestedToExitKeys(id, {
        maxBlocksDepth: MAX_BLOCKS_DEPTH_TWO_WEEKS,
      }),
      this.getApiKeysDuplicates(id),
      this.getClKeysStatus(id),
      this.bus.strikes?.getKeysWithStrikes(id) ?? Promise.resolve([]),
    ]);

    const ejectableEpoch = currentEpoch - EJECTABLE_EPOCH_COUNT;

    return keys.map((pubkey, index) => {
      const prefilled = clKeysStatus?.find((item) => item.pubkey === pubkey);
      const keyStrikes = keysWithStrikes.find((item) => item.pubkey === pubkey);

      const statuses = computeStatuses({
        pubkey,
        keyIndex: index,
        info,
        prefilled,
        ejectableEpoch,
        unboundCount,
        duplicates,
        withdrawalSubmitted,
        requestedToExit,
        hasCLStatuses: !!clKeysStatus,
        hasStrikes: !!keyStrikes?.strikes.reduce((a, b) => a + b, 0),
      });

      return {
        pubkey,
        index,
        statuses,
        validatorIndex: prefilled?.validatorIndex,
        effectiveBalance: prefilled?.effectiveBalance,
        strikes: keyStrikes?.strikes,
      };
    });
  }
}
