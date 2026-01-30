import { ERROR_CODE, SDKError } from '@lidofinance/lido-ethereum-sdk';
import { decodeEventLog, getAbiItem, Hex, toEventHash } from 'viem';
import { CuratedModuleAbi } from '../../abi/index.js';
import { ReceiptLike } from '../../tx-sdk/types.js';

const NODE_OPERATOR_ADDED_EVENT = getAbiItem({
  abi: CuratedModuleAbi,
  name: 'NodeOperatorAdded',
});

const NODE_OPERATOR_ADDED_SIGNATURE = toEventHash(NODE_OPERATOR_ADDED_EVENT);

export const parseCuratedModuleNodeOperatorAddedEvents = async (
  receipt: ReceiptLike,
): Promise<bigint> => {
  for (const log of receipt.logs) {
    if (log.topics[0] !== NODE_OPERATOR_ADDED_SIGNATURE) continue;
    const parsedLog = decodeEventLog({
      abi: [NODE_OPERATOR_ADDED_EVENT],
      strict: true,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]],
    });
    return parsedLog.args.nodeOperatorId;
  }
  throw new SDKError({
    message: 'could not find NodeOperatorAdded event in transaction',
    code: ERROR_CODE.TRANSACTION_ERROR,
  });
};
