import {
  AccountValue,
  LidoSDKCore,
  type LidoSdkPublicClient,
  type LidoSdkWalletClient,
  NOOP,
  TransactionOptions,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { Address, WalletCallReceipt } from 'viem';
import type { ReplacementReturnType } from 'viem/actions';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable';
import {
  CACHE_SHORT,
  ERROR_CODE,
  SDKError,
  withSDKError,
} from '../common/index';
import { Cache, Logger } from '../common/decorators/index';
import { isCapabilitySupported } from '../common/utils/is-capability-supported';
import {
  CallResult,
  PerformTransactionGasLimit,
  PerformTransactionSendTransaction,
  ReceiptLike,
  TransactionCallbackStage,
} from '../tx-sdk/types';
import { AA_POLLING_INTERVAL, AA_TX_POLLING_TIMEOUT } from './consts';
import { BatchTransactionRevertedError, DecodeResultError } from './errors';
import { SendCallsProps, SendTransactionProps, WalletSDKProps } from './types';

/** Chain-scoped wallet detection and transaction sending; shared by every module SDK. */
export class WalletSDK extends CsmSDKCacheable {
  readonly core: LidoSDKCore;

  // Nothing here depends on module state, so no tx ever needs to invalidate it.
  get cacheVersion() {
    return 0;
  }

  constructor(props: WalletSDKProps) {
    super();
    this.core = props.core;
  }

  get chainId(): number {
    return this.core.chain.id;
  }

  get walletClient(): LidoSdkWalletClient {
    return this.core.useWalletClient();
  }

  get publicClient(): LidoSdkPublicClient {
    return this.core.publicClient;
  }

  @Logger('Views:')
  @Cache(CACHE_SHORT)
  public async isAbstractAccount(account: Address): Promise<boolean> {
    try {
      const capabilities = await this.walletClient.getCapabilities({
        account,
      });
      return isCapabilitySupported(capabilities, this.chainId, 'atomic');
    } catch {
      return false;
    }
  }

  @Logger('Views:')
  public async isMultisig(account?: AccountValue): Promise<boolean> {
    const { address } = await this.core.useAccount(account);
    return this.isContract(address);
  }

  @Cache(CACHE_SHORT)
  private isContract(address: Address): Promise<boolean> {
    return this.core.isContract(address);
  }

  public callToTransaction(call: CallResult): {
    getGasLimit: PerformTransactionGasLimit;
    sendTransaction: PerformTransactionSendTransaction;
  } {
    return {
      getGasLimit: (options) =>
        this.publicClient.estimateGas({
          ...options,
          to: call.to,
          data: call.data,
          value: call.value,
        }),
      sendTransaction: (options) =>
        this.walletClient.sendTransaction({
          ...options,
          to: call.to,
          data: call.data,
          value: call.value,
        }),
    };
  }

  // sendTransaction (EOA) and sendCalls (AA) both reach this helper only
  // after the tx is mined and confirmed. If the caller-supplied decodeResult
  // throws, the on-chain state already changed — surface that via
  // DecodeResultError so consumers can recover hash/receipt instead of
  // collapsing a successful tx into a bare UNKNOWN_ERROR.
  private async runDecodeResult<TDecodedResult>(opts: {
    decodeResult:
      ((receipt: ReceiptLike) => Promise<TDecodedResult>) | undefined;
    receipt: ReceiptLike;
    hash: `0x${string}`;
    confirmations: bigint;
  }): Promise<TDecodedResult | undefined> {
    const { decodeResult, receipt, hash, confirmations } = opts;
    if (!decodeResult) return undefined;
    try {
      return await decodeResult(receipt);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to decode transaction result';
      const decodeErr = new DecodeResultError(message, {
        hash,
        receipt,
        confirmations,
        cause: error,
      });
      throw new SDKError({
        code: ERROR_CODE.DECODE_RESULT_ERROR,
        error: decodeErr,
        message: decodeErr.message,
      });
    }
  }

  public async sendTransaction<TDecodedResult = undefined>(
    props: SendTransactionProps<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const {
      callback = NOOP,
      getGasLimit,
      sendTransaction,
      decodeResult,
      waitForTransactionReceiptParameters,
    } = props;
    const account = await this.core.useAccount(props.account);
    const isContractAccount = await this.isContract(account.address);

    let overrides: TransactionOptions = {
      account,
      chain: this.core.chain,
      gas: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };

    if (isContractAccount) {
      // passing these stub params prevent unnecessary possibly errorish RPC calls
      overrides = {
        ...overrides,
        gas: 21_000n,
        maxFeePerGas: 1n,
        maxPriorityFeePerGas: 1n,
        nonce: 1,
      };
    } else {
      await callback({ stage: TransactionCallbackStage.GAS_LIMIT });
      const feeData = await this.core.getFeeData();
      overrides.maxFeePerGas = feeData.maxFeePerGas;
      overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      try {
        overrides.gas = await getGasLimit({ ...overrides });
      } catch {
        // we retry without fees to see if tx will go trough
        await withSDKError(
          getGasLimit({
            ...overrides,
            maxFeePerGas: undefined,
            maxPriorityFeePerGas: undefined,
          }),
          ERROR_CODE.TRANSACTION_ERROR,
        );
        throw new SDKError({
          code: ERROR_CODE.TRANSACTION_ERROR,
          message: 'Not enough ether for gas',
        });
      }
    }

    const customGas = await callback({
      stage: TransactionCallbackStage.SIGN,
      payload: { gas: overrides.gas },
    });

    if (typeof customGas === 'bigint') overrides.gas = customGas;

    const hash = await withSDKError(
      sendTransaction({
        ...overrides,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    if (isContractAccount) {
      await callback({ stage: TransactionCallbackStage.MULTISIG_DONE });
      return { hash };
    }

    await callback({
      stage: TransactionCallbackStage.RECEIPT,
      payload: { hash },
    });

    // onReplaced fires mid-poll: on a non-repriced replacement the receipt that
    // resolves belongs to another transaction, so it is never our success
    let replacement: ReplacementReturnType | undefined;

    const receipt = await withSDKError(
      this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
        ...waitForTransactionReceiptParameters,
        onReplaced: (response) => {
          replacement = response;
          waitForTransactionReceiptParameters?.onReplaced?.(response);
        },
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    if (replacement && replacement.reason !== 'repriced') {
      throw new SDKError({
        code: ERROR_CODE.TRANSACTION_ERROR,
        message: `Transaction was ${replacement.reason}, not confirmed`,
      });
    }

    if (receipt.status === 'reverted') {
      throw new SDKError({
        code: ERROR_CODE.TRANSACTION_REVERTED,
        message:
          'Transaction was included into block but reverted during execution',
      });
    }

    // on a repriced replacement the receipt (and confirmed hash) belong to the
    // replacement tx, not the one we originally signed
    const confirmedHash = replacement?.transaction.hash ?? hash;

    await callback({
      stage: TransactionCallbackStage.CONFIRMATION,
      payload: { receipt, hash: confirmedHash },
    });

    const confirmations = await this.publicClient.getTransactionConfirmations({
      hash: receipt.transactionHash,
    });

    const result = await this.runDecodeResult({
      decodeResult,
      receipt,
      hash: confirmedHash,
      confirmations,
    });

    await callback({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: result as Awaited<TDecodedResult>,
        confirmations,
        receipt,
        hash: confirmedHash,
      },
    });

    return {
      hash: confirmedHash,
      receipt,
      result,
      confirmations,
    };
  }

  public async sendCalls<TDecodedResult = undefined>(
    props: SendCallsProps<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const {
      callback = NOOP,
      calls,
      decodeResult,
      waitForTransactionReceiptParameters = {},
    } = props;
    const account = await this.core.useAccount(props.account);

    await callback({
      stage: TransactionCallbackStage.SIGN,
      payload: { gas: undefined },
    });

    const callData = await withSDKError(
      this.walletClient.sendCalls({
        account,
        calls,
        experimental_fallback: true,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    await callback({
      stage: TransactionCallbackStage.RECEIPT,
      payload: { id: callData.id },
    });

    const callStatus = await withSDKError(
      this.walletClient.waitForCallsStatus({
        id: callData.id,
        pollingInterval: AA_POLLING_INTERVAL,
        timeout: AA_TX_POLLING_TIMEOUT,
        ...waitForTransactionReceiptParameters,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    // On-chain receipt is the source of truth. Some smart-account wallets
    // (e.g. ERC-4337 with paymasters whose post-op reverts) report a batch
    // failure even when the user's call succeeded on-chain — trust the
    // receipt over `callStatus.status`.
    const receipts = callStatus.receipts ?? [];
    const receipt = receipts.at(-1) as
      WalletCallReceipt<bigint, 'success' | 'reverted'> | undefined;

    if (receipts.some((r) => r.status === 'reverted')) {
      const batchErr = new BatchTransactionRevertedError(
        'Some operations were reverted. Check your wallet for details.',
        { receipts, callStatus },
      );
      throw new SDKError({
        code: ERROR_CODE.TRANSACTION_ERROR,
        error: batchErr,
        message: batchErr.message,
      });
    }

    if (!receipt?.transactionHash) {
      const batchErr = new BatchTransactionRevertedError(
        callStatus.status === 'failure'
          ? 'Transaction failed. Check your wallet for details.'
          : 'Transaction hash is missing. Check your wallet for details.',
        { receipts, callStatus },
      );
      throw new SDKError({
        code: ERROR_CODE.TRANSACTION_ERROR,
        error: batchErr,
        message: batchErr.message,
      });
    }

    const txHash = receipt.transactionHash;

    const confirmations = await this.publicClient.getTransactionConfirmations({
      hash: txHash,
    });

    const result = await this.runDecodeResult({
      decodeResult,
      receipt: receipt as ReceiptLike,
      hash: txHash,
      confirmations,
    });

    await callback({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: result as TDecodedResult,
        confirmations,
        receipt: receipt as ReceiptLike,
        hash: txHash,
        id: callData.id,
      },
    });

    return {
      hash: txHash,
      receipt: receipt as any,
      result,
      confirmations,
    };
  }
}
