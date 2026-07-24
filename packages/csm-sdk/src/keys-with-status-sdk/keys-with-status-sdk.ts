import { Hex, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index';
import {
  CACHE_MID,
  EJECTABLE_EPOCH_COUNT,
  MAX_BLOCKS_DEPTH_TWO_WEEKS,
  MODULE_NAME,
} from '../common/index';
import { NodeOperatorId } from '../common/types';
import { fetchJson, isNotUnique, isUnique } from '../common/utils/index';
import { EventsSDK } from '../events-sdk/events-sdk';
import { FrameSDK } from '../frame-sdk/frame-sdk';
import { OperatorSDK } from '../operator-sdk/operator-sdk';
import { StrikesSDK } from '../strikes-sdk/strikes-sdk';
import { getClUrls } from './cl-chunks';
import { computeStatuses } from './compute-statuses';
import { ClPreparedKey, parseClResponse } from './parse-cl-response';
import { resolveEffectiveBalance } from './resolve-effective-balance';
import { FindKeysResponse, KeyWithStatus } from './types';

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

    const moduleAddress = this.core.contractBaseModule.address;

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
      urls.map((url) => fetchJson(url, undefined, parseClResponse)),
    );

    return results.flat().filter(Boolean);
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
    const isCM = this.core.moduleName === MODULE_NAME.CM;
    const hasQueue = this.core.moduleName === MODULE_NAME.CSM;

    const [
      info,
      unboundCount,
      keys,
      currentEpoch,
      withdrawalSubmitted,
      requestedToExit,
      triggeredEjection,
      duplicates,
      clKeysStatus,
      keysWithStrikes,
    ] = await Promise.all([
      this.bus.operator.getInfo(id),
      this.bus.operator.getUnboundKeysCount(id),
      this.bus.operator.getKeys(id),
      this.bus.frame.getCurrentEpoch(),
      this.bus.events.getWithdrawalSubmittedKeys(id, {
        maxBlocksDepth: MAX_BLOCKS_DEPTH_TWO_WEEKS,
      }),
      this.bus.events.getRequestedToExitKeys(id, {
        maxBlocksDepth: MAX_BLOCKS_DEPTH_TWO_WEEKS,
      }),
      this.bus.events.getTriggeredEjectionKeys(id, {
        maxBlocksDepth: MAX_BLOCKS_DEPTH_TWO_WEEKS,
      }),
      this.getApiKeysDuplicates(id),
      this.getClKeysStatus(id),
      this.bus.strikes?.getKeysWithStrikes(id) ?? Promise.resolve([]),
    ]);

    const allocatedBalances =
      isCM && keys.length > 0
        ? await this.bus.operator.getKeyAllocatedBalances(id)
        : undefined;

    const ejectableEpoch = currentEpoch - EJECTABLE_EPOCH_COUNT;

    const clStatusMap = new Map(clKeysStatus?.map((k) => [k.pubkey, k]));
    const strikesMap = new Map(keysWithStrikes.map((k) => [k.pubkey, k]));

    return keys.map((pubkey, index) => {
      const prefilled = clStatusMap.get(pubkey);
      const keyStrikes = strikesMap.get(pubkey);

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
        triggeredEjection,
        hasCLStatuses: !!clKeysStatus,
        hasStrikes: !!keyStrikes?.strikes.reduce((a, b) => a + b, 0),
        hasQueue,
      });

      const effectiveBalance = resolveEffectiveBalance({
        statuses,
        prefilled,
        allocatedBalance: allocatedBalances?.[index],
      });

      return {
        pubkey,
        index,
        statuses,
        validatorIndex: prefilled?.validatorIndex,
        effectiveBalance,
        strikes: keyStrikes?.strikes,
      };
    });
  }
}
