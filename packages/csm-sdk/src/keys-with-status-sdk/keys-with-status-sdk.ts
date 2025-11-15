import { Hex, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CACHE_MID,
  CSM_CONTRACT_NAMES,
  EJECTABLE_EPOCH_COUNT,
  KEY_STATUS,
  MAX_BLOCKS_DEPTH_TWO_WEEKS,
} from '../common/index.js';
import { NodeOperatorId } from '../common/types.js';
import { compareLowercase } from '../common/utils/compare-lowercase.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { isNotUnique, isUnique } from '../common/utils/is-defined.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { StrikesSDK } from '../strikes-sdk/strikes-sdk.js';
import { getClUrls, prepareKey } from './cl-chunks.js';
import {
  ClPreparedKey,
  ClValidatorsResponse,
  FindKeysResponse,
  KeyWithStatus,
} from './types.js';
import { hasNoInterception } from './utils.js';

export class KeysWithStatusSDK extends CsmSDKModule<{
  operator: OperatorSDK;
  strikes: StrikesSDK;
  events: EventsSDK;
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
    pubkeys: Hex[],
  ): Promise<Hex[] | null> {
    const keys = await this.getApiKeys(pubkeys);
    if (!keys) return null;

    const csmAddress = this.core.getContractAddress(
      CSM_CONTRACT_NAMES.csModule,
    );

    const duplicates = [
      ...keys.map(({ key }) => key).filter(isNotUnique),
      ...keys
        .filter(
          (key) =>
            key.operatorIndex !== Number(nodeOperatorId) ||
            !isAddressEqual(key.moduleAddress, csmAddress),
        )
        .map(({ key }) => key),
    ].filter(isUnique);

    return duplicates;
  }

  @Logger('API:')
  @ErrorHandler()
  @Cache(CACHE_MID)
  public async getClKeysStatus(
    pubkeys: Hex[],
  ): Promise<ClPreparedKey[] | null> {
    if (!this.core.clApiUrl) {
      return null;
    }

    const urls = getClUrls(pubkeys, this.core.clApiUrl);
    const results = await Promise.all(
      urls.map((url) => fetchJson<ClValidatorsResponse>(url)),
    );

    return results.flatMap(({ data }) => data.map(prepareKey));
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getCurrentEpoch() {
    const [
      [slotsPerEpoch, secondsPerSlot, genesisTime],
      { timestamp: latestBlockTimestamp },
    ] = await Promise.all([
      this.core.contractHashConsensus.read.getChainConfig(),
      this.core.publicClient.getBlock({ blockTag: 'latest' }),
    ]);

    const latestSlot = (latestBlockTimestamp - genesisTime) / secondsPerSlot;
    const currentEpoch = latestSlot / slotsPerEpoch;

    return currentEpoch;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getKeys(id: NodeOperatorId): Promise<KeyWithStatus[]> {
    const [info, unboundCount, keys, currentEpoch] = await Promise.all([
      this.bus.operator.getInfo(id),
      this.bus.operator.getUnboundKeysCount(id),
      this.bus.operator.getKeys(id),
      this.getCurrentEpoch(),
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
      this.getApiKeysDuplicates(id, keys),
      this.getClKeysStatus(keys),
      this.bus.strikes.getKeysWithStrikes(id),
    ]);

    const ejectableEpoch = currentEpoch - EJECTABLE_EPOCH_COUNT;

    const getStatuses = (
      pubkey: Hex,
      nodeOperatorKeyIndex: number,
    ): KEY_STATUS[] => {
      const statuses: KEY_STATUS[] = [];
      const prefilled = clKeysStatus?.find((item) => item.pubkey === pubkey);

      if (prefilled?.slashed) {
        statuses.push(KEY_STATUS.SLASHED);
      }

      if (
        withdrawalSubmitted?.includes(pubkey) ||
        prefilled?.status === KEY_STATUS.WITHDRAWN
      ) {
        return [...statuses, KEY_STATUS.WITHDRAWN];
      }

      if (
        keysWithStrikes
          .find((item) => item.pubkey === pubkey)
          ?.strikes.reduce((a, b) => a + b, 0)
      ) {
        statuses.push(KEY_STATUS.WITH_STRIKES);
      }

      if (nodeOperatorKeyIndex >= info.totalVettedKeys) {
        if (duplicates?.includes(pubkey)) {
          return [...statuses, KEY_STATUS.DUPLICATED];
        } else if (nodeOperatorKeyIndex === info.totalVettedKeys) {
          return [...statuses, KEY_STATUS.INVALID];
        }
      }

      if (
        nodeOperatorKeyIndex >= info.totalDepositedKeys &&
        info.enqueuedCount < info.depositableValidatorsCount
      ) {
        statuses.push(KEY_STATUS.NON_QUEUED);
      } else if (nodeOperatorKeyIndex >= info.totalVettedKeys) {
        statuses.push(KEY_STATUS.UNCHECKED);
      } else if (prefilled?.status) {
        if (
          prefilled.status === KEY_STATUS.ACTIVE &&
          prefilled.activationEpoch < ejectableEpoch
        ) {
          statuses.push(KEY_STATUS.EJECTABLE);
        }
        statuses.push(prefilled.status);
      } else if (nodeOperatorKeyIndex >= info.totalDepositedKeys) {
        statuses.push(KEY_STATUS.DEPOSITABLE);
      } else {
        if (!clKeysStatus) {
          statuses.push(KEY_STATUS.EJECTABLE);
        }
        statuses.push(
          clKeysStatus ? KEY_STATUS.ACTIVATION_PENDING : KEY_STATUS.ACTIVE,
        );
      }

      if (
        hasNoInterception(statuses, [
          KEY_STATUS.SLASHED,
          KEY_STATUS.WITHDRAWN,
          KEY_STATUS.WITHDRAWAL_PENDING,
          KEY_STATUS.EXITING,
        ])
      ) {
        const exitRequestIndex = requestedToExit.findIndex((key) =>
          compareLowercase(pubkey, key),
        );

        if (exitRequestIndex >= 0) {
          statuses.push(KEY_STATUS.EXIT_REQUESTED);
        }
      }

      if (
        hasNoInterception(statuses, [
          KEY_STATUS.SLASHED,
          KEY_STATUS.WITHDRAWN,
          KEY_STATUS.EXIT_REQUESTED,
        ]) &&
        unboundCount &&
        info.totalAddedKeys - nodeOperatorKeyIndex < unboundCount
      ) {
        statuses.push(KEY_STATUS.UNBONDED);
      }

      return statuses;
    };

    return keys.map((pubkey, index) => ({
      pubkey,
      index,
      statuses: getStatuses(pubkey, index),
      validatorIndex: clKeysStatus?.find((item) => item.pubkey === pubkey)
        ?.validatorIndex,
      strikes: keysWithStrikes.find((item) => item.pubkey === pubkey)?.strikes,
    }));
  }
}
