import { Hex, isAddressEqual } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { Cache } from '../common/decorators/cache.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import {
  CSM_CONTRACT_NAMES,
  EJECTABLE_EPOCH_COUNT,
  KEY_STATUS,
} from '../common/index.js';
import { NodeOperatorId } from '../common/types.js';
import { fetchJson } from '../common/utils/fetch-json.js';
import { isNotUnique, isUnique } from '../common/utils/is-defined.js';
import { EventsSDK } from '../events-sdk/events-sdk.js';
import { OperatorSDK } from '../operator-sdk/operator-sdk.js';
import { getClUrls, prepareKey } from './cl-chunks.js';
import {
  ClPreparedKey,
  ClValidatorsResponse,
  FindKeysResponse,
  KeyWithStatus,
} from './types.js';
import { hasNoInterception } from './utils.js';
import { StrikesSDK } from '../strikes-sdk/strikes-sdk.js';

export class KeysWithStatusSDK extends CsmSDKModule<{
  operator: OperatorSDK;
  strikes: StrikesSDK;
  events: EventsSDK;
}> {
  @Logger('API:')
  @ErrorHandler()
  @Cache(60 * 1000)
  public async getApiKeysDuplicates(
    nodeOperatorId: NodeOperatorId,
    pubkeys: Hex[],
  ): Promise<Hex[] | null> {
    const keysApi = this.core.keysApiLink;

    if (!keysApi) {
      throw new Error('Keys API link is not configured');
    }

    const url = `${keysApi}/v1/keys/find`;

    const response = await fetchJson<FindKeysResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ pubkeys }),
    }).catch(() => null);

    if (!response) return null;

    const keys = response.data;

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
  @Cache(60 * 1000)
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
      this.core.getContractHashConsensus().read.getChainConfig(),
      this.core.client.getBlock({ blockTag: 'latest' }),
    ]);

    const latestSlot = (latestBlockTimestamp - genesisTime) / secondsPerSlot;
    const currentEpoch = latestSlot / slotsPerEpoch;

    return currentEpoch;
  }

  @Logger('Utils:')
  public async getKeys(id: NodeOperatorId): Promise<KeyWithStatus[]> {
    const [info, unboundCount, keys, currentEpoch] = await Promise.all([
      this.bus.getOrThrow('operator').getInfo(id),
      this.bus.getOrThrow('operator').getUnboundKeysCount(id),
      this.bus.getOrThrow('operator').getKeys(id),
      this.getCurrentEpoch(),
    ]);
    const [
      withdrawalSubmitted,
      requestedToExit,
      duplicates,
      clKeysStatus,
      keysWithStrikes,
    ] = await Promise.all([
      this.bus.getOrThrow('events').getWithdrawalSubmittedKeys(id),
      this.bus.getOrThrow('events').getRequestedToExitKeys(id),
      this.getApiKeysDuplicates(id, keys),
      this.getClKeysStatus(keys),
      this.bus.getOrThrow('strikes').getKeysWithStrikes(id),
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

      if (nodeOperatorKeyIndex >= info.totalVettedKeys) {
        if (duplicates?.includes(pubkey)) {
          return [...statuses, KEY_STATUS.DUPLICATED];
        } else if (nodeOperatorKeyIndex === info.totalVettedKeys) {
          return [...statuses, KEY_STATUS.INVALID];
        }
      }

      if (withdrawalSubmitted?.includes(pubkey)) {
        return [...statuses, KEY_STATUS.WITHDRAWN];
      }

      if (
        nodeOperatorKeyIndex >= info.totalDepositedKeys &&
        info.enqueuedCount < info.depositableValidatorsCount
      ) {
        statuses.push(KEY_STATUS.NON_QUEUED);
      } else if (nodeOperatorKeyIndex >= info.totalVettedKeys) {
        statuses.push(KEY_STATUS.UNCHECKED);
      } else if (prefilled?.status) {
        if (prefilled.activationEpoch < ejectableEpoch) {
          statuses.push(KEY_STATUS.EJECTABLE);
        }
        statuses.push(prefilled.status);
      } else if (nodeOperatorKeyIndex >= info.totalDepositedKeys) {
        statuses.push(KEY_STATUS.DEPOSITABLE);
      } else {
        if (!prefilled || prefilled.activationEpoch < ejectableEpoch) {
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
          isAddressEqual(pubkey, key),
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

      if (
        keysWithStrikes
          .find((item) => item.pubkey === pubkey)
          ?.strikes.reduce((a, b) => a + b, 0)
      ) {
        statuses.push(KEY_STATUS.WITH_STRIKES);
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
