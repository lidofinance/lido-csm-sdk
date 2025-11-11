import {
  PerformTransactionGasLimit,
  PerformTransactionSendTransaction,
} from '@lidofinance/lido-ethereum-sdk';
import type { Call, WaitForTransactionReceiptParameters } from 'viem';
import type {
  CommonTransactionProps,
  PerformOptionsDecodePartial,
  PerformOptionsSpend,
} from './types.js';

// Internal Transaction Types

export type PerformTransactionOptions<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> & {
    getGasLimit: PerformTransactionGasLimit;
    sendTransaction: PerformTransactionSendTransaction;
    waitForTransactionReceiptParameters?: WaitForTransactionReceiptParameters;
  } & PerformOptionsDecodePartial<TDecodedResult>;

export type PerformCallOptions<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> & {
    calls: Call[];
    waitForTransactionReceiptParameters?: WaitForTransactionReceiptParameters;
  } & PerformOptionsDecodePartial<TDecodedResult>;

// Internal Utility Types

export type SignPermitOrApproveProps = Omit<
  PerformOptionsSpend<any>,
  'call' | 'decodeResult'
>;
