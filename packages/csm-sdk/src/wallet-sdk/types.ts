import {
  LidoSDKCore,
  PerformTransactionGasLimit,
  PerformTransactionSendTransaction,
} from '@lidofinance/lido-ethereum-sdk';
import type { Call } from 'viem';
import type {
  CommonTransactionProps,
  PerformOptionsDecodePartial,
} from '../tx-sdk/types';

export type WalletSDKProps = { core: LidoSDKCore };

export type SendTransactionProps<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & {
      getGasLimit: PerformTransactionGasLimit;
      sendTransaction: PerformTransactionSendTransaction;
    };

export type SendCallsProps<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & { calls: Call[] };
