import { AccountValue } from '@lidofinance/lido-ethereum-sdk';
import type {
  Address,
  Hash,
  Hex,
  TransactionReceipt,
  WaitForTransactionReceiptParameters,
  WalletCallReceipt,
} from 'viem';
import { Erc20Tokens, PermitSignatureShort } from '../common/index.js';

// Core Transaction Props

export type CommonTransactionProps<TDecodedResult = undefined> = {
  callback?: TransactionCallback<TDecodedResult>;
  account?: AccountValue;
  waitForTransactionReceiptParameters?: WaitForTransactionReceiptParameters;
};

export type ReceiptLike = TransactionReceipt | WalletCallReceipt;

// Spending-related Props

export type AmountAndTokenProps = {
  amount: bigint;
  token: Erc20Tokens;
};

export type AllowanceProps = Pick<AmountAndTokenProps, 'token'> &
  Pick<CommonTransactionProps, 'account'>;

// Callback Types

export enum TransactionCallbackStage {
  'PERMIT_SIGN' = 'permit_sign',
  'APPROVE_SIGN' = 'approve_sign',
  'APPROVE_RECEIPT' = 'approve_receipt',
  'GAS_LIMIT' = 'gas_limit',
  'SIGN' = 'sign',
  'RECEIPT' = 'receipt',
  'CONFIRMATION' = 'confirmation',
  'DONE' = 'done',
  'MULTISIG_DONE' = 'multisig_done',
  'ERROR' = 'error',
}

export type TransactionCallbackProps<TDecodedResult = undefined> =
  | {
      stage: TransactionCallbackStage.PERMIT_SIGN;
      payload: { token: Erc20Tokens; amount: bigint };
    }
  | {
      stage: TransactionCallbackStage.APPROVE_SIGN;
      payload: { token: Erc20Tokens; amount: bigint };
    }
  | {
      stage: TransactionCallbackStage.APPROVE_RECEIPT;
      payload: { token: Erc20Tokens; amount: bigint; hash: Hash };
    }
  | { stage: TransactionCallbackStage.GAS_LIMIT; payload?: undefined }
  | { stage: TransactionCallbackStage.SIGN; payload: { gas?: bigint } }
  | {
      stage: TransactionCallbackStage.RECEIPT;
      payload: { hash?: Hash; id?: string };
    }
  | {
      stage: TransactionCallbackStage.CONFIRMATION;
      payload: { receipt: ReceiptLike; hash: Hash };
    }
  | {
      stage: TransactionCallbackStage.DONE;
      payload: {
        result: TDecodedResult;
        confirmations: bigint;
        receipt: ReceiptLike;
        hash: Hash;
        id?: string;
      };
    }
  | { stage: TransactionCallbackStage.MULTISIG_DONE; payload?: undefined }
  | {
      stage: TransactionCallbackStage.ERROR;
      payload: { error: any }; // SDKError
    };

export type TransactionCallback<TDecodedResult = undefined> = (
  props: TransactionCallbackProps<TDecodedResult>,
) => Promise<bigint | undefined | void> | bigint | undefined | void;

// Perform Props and Call Types

export type CallResult = {
  data: Hex | undefined;
  to: Address;
  value?: bigint | undefined;
};

export type CommonCallProps = {
  from: Address;
};

export type CommonCallPropsWithPermit = CommonCallProps & {
  permit: PermitSignatureShort;
};

export type SpendOptions = AmountAndTokenProps & {
  permit?: PermitSignatureShort;
  deadline?: bigint;
};

export type PerformOptionsDecodePartial<TDecodedResult> =
  TDecodedResult extends undefined
    ? { decodeResult?: (receipt: ReceiptLike) => Promise<TDecodedResult> }
    : { decodeResult: (receipt: ReceiptLike) => Promise<TDecodedResult> };

export type PerformOptionsNoSpend<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & {
      spend?: undefined;
      call: (props: CommonCallProps) => CallResult;
    };

export type PerformOptionsSpend<TDecodedResult = undefined> =
  CommonTransactionProps<TDecodedResult> &
    PerformOptionsDecodePartial<TDecodedResult> & {
      spend: SpendOptions;
      call: (props: CommonCallPropsWithPermit) => CallResult;
    };

export type PerformOptions<TDecodedResult = undefined> =
  | PerformOptionsNoSpend<TDecodedResult>
  | PerformOptionsSpend<TDecodedResult>;

export {
  type PerformTransactionGasLimit,
  type PerformTransactionSendTransaction,
} from '@lidofinance/lido-ethereum-sdk';
