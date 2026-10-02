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

export type WalletKind = 'eoa' | 'multisig' | 'atomicBatch';

export type WalletSDKProps = { core: LidoSDKCore };

export type SendTransactionProps<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & {
      getGasLimit: PerformTransactionGasLimit;
      sendTransaction: PerformTransactionSendTransaction;
      /** Contract-account wallet: stub gas/fees and return the hash without waiting for a receipt. */
      multisig?: boolean;
    };

export type SendCallsProps<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & { calls: Call[] };
