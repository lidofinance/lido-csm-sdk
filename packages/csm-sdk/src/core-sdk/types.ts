import {
  AccountValue,
  LidoSDKCore,
  PerformTransactionGasLimit,
  PerformTransactionSendTransaction,
  SDKError,
  TransactionCallbackStage,
} from '@lidofinance/lido-ethereum-sdk';
import type {
  AbiEvent,
  Address,
  BlockNumber,
  BlockTag,
  Hash,
  MaybeAbiEventName,
  MaybeExtractEventArgsFromAbi,
  TransactionReceipt,
  WaitForTransactionReceiptParameters,
} from 'viem';
import { getLogs } from 'viem/actions';

// Constructor Props

export type CsmCoreProps = {
  core: LidoSDKCore;
};

// Transaction Props

export type CommonTransactionProps<TDecodedResult = undefined> = {
  callback?: TransactionCallback<TDecodedResult>;
  account?: AccountValue;
  waitForTransactionReceiptParameters?: WaitForTransactionReceiptParameters;
};

export type PerformTransactionDecodeResult<TDecodedResult> = (
  receipt: TransactionReceipt,
) => Promise<TDecodedResult>;

type PerformTransactionOptionsDecodePartial<TDecodedResult> =
  TDecodedResult extends undefined
    ? { decodeResult?: undefined }
    : { decodeResult: PerformTransactionDecodeResult<TDecodedResult> };

export type PerformTransactionOptions<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> & {
    getGasLimit: PerformTransactionGasLimit;
    sendTransaction: PerformTransactionSendTransaction;
    waitForTransactionReceiptParameters?: WaitForTransactionReceiptParameters;
  } & PerformTransactionOptionsDecodePartial<TDecodedResult>;

// Callback

export type TransactionCallbackProps<TDecodedResult> =
  | { stage: TransactionCallbackStage.PERMIT; payload?: undefined }
  | { stage: TransactionCallbackStage.GAS_LIMIT; payload?: undefined }
  | { stage: TransactionCallbackStage.SIGN; payload: { gas?: bigint } }
  | { stage: TransactionCallbackStage.RECEIPT; payload: { hash: Hash } }
  | {
      stage: TransactionCallbackStage.CONFIRMATION;
      payload: { receipt: TransactionReceipt; hash: Hash };
    }
  | {
      stage: TransactionCallbackStage.DONE;
      payload: {
        result?: TDecodedResult;
        confirmations: bigint;
        receipt: TransactionReceipt;
        hash: Hash;
      };
    }
  | { stage: TransactionCallbackStage.MULTISIG_DONE; payload?: undefined }
  | { stage: TransactionCallbackStage.ERROR; payload: { error: SDKError } };

// callback return type based on stage
type TransactionCallbackReturn<TProps> = TProps extends {
  stage: TransactionCallbackStage.SIGN;
}
  ? bigint | undefined
  : void;

// support both async and non async callbacks
export type TransactionCallbackResult<TProps> =
  | TransactionCallbackReturn<TProps>
  | Promise<TransactionCallbackReturn<TProps>>;

export type TransactionCallback<TDecodedResult> = (
  props: TransactionCallbackProps<TDecodedResult>,
) => TransactionCallbackResult<TransactionCallbackProps<TDecodedResult>>;

// Permit

export type PermitCallbackProps =
  | { stage: TransactionCallbackStage.SIGN; payload?: undefined }
  | { stage: TransactionCallbackStage.DONE; payload?: undefined }
  | { stage: TransactionCallbackStage.ERROR; payload: SDKError };

export type PermitCallback = (props: PermitCallbackProps) => void;

// TODO: use type from core ?
export type PermitSignature = {
  v: number;
  r: `0x${string}`;
  s: `0x${string}`;
  value: bigint;
  deadline: bigint;
  chainId: bigint;
  nonce: bigint;
  owner: Address;
  spender: Address;
};

// Events Props

export type NonPendingBlockTag = Exclude<BlockTag, 'pending'>;
export type EventRangeProps = {
  step?: number;
  fromBlock?: BlockNumber | NonPendingBlockTag;
  toBlock?: BlockNumber | NonPendingBlockTag;
};

export type LoadEventsProps<
  abiEvent extends AbiEvent | undefined = undefined,
  abiEvents extends
    | readonly AbiEvent[]
    | readonly unknown[]
    | undefined = abiEvent extends AbiEvent ? [abiEvent] : undefined,
  _eventName extends string | undefined = MaybeAbiEventName<abiEvent>,
> = {
  address: Address;
  event: abiEvent;
  args?: MaybeExtractEventArgsFromAbi<abiEvents, _eventName> | undefined;
} & EventRangeProps;

export type LoadEventsProps2 = Parameters<typeof getLogs>[1] & EventRangeProps;
