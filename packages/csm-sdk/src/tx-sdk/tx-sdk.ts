import {
  AccountValue,
  CheckAllowanceResult,
  NOOP,
  TransactionOptions,
  TransactionResult,
} from '@lidofinance/lido-ethereum-sdk';
import { Address, Call, erc20Abi, WalletCallReceipt } from 'viem';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { ErrorHandler } from '../common/decorators/error-handler';
import { Logger } from '../common/decorators/logger';
import {
  CONTRACT_NAMES,
  EMPTY_PERMIT,
  Erc20Tokens,
  ERROR_CODE,
  PermitSignatureShort,
  SDKError,
  withSDKError,
} from '../common/index';
import { isCapabilitySupported } from '../common/utils/is-capability-supported';
import { BindedContract } from '../core-sdk/types';
import { AA_POLLING_INTERVAL, AA_TX_POLLING_TIMEOUT } from './consts';
import { BatchTransactionRevertedError, DecodeResultError } from './errors';
import {
  PerformCallOptions,
  PerformTransactionOptions,
  SignPermitOrApproveProps,
} from './internal-types';
import { parseSpendingProps } from './parse-spending-props';
import { stripPermit } from './strip-permit';
import {
  AllowanceProps,
  AmountAndTokenProps,
  CallResult,
  PerformOptions,
  PerformOptionsNoSpend,
  PerformOptionsSpend,
  PerformTransactionGasLimit,
  PerformTransactionSendTransaction,
  ReceiptLike,
  TransactionCallback,
  TransactionCallbackStage,
} from './types';

export class TxSDK extends CsmSDKModule {
  protected get spender(): Address {
    return this.core.getContractAddress(CONTRACT_NAMES.accounting);
  }

  private getTokenContract(
    token: Erc20Tokens,
  ): BindedContract<typeof erc20Abi> {
    return this.core.getContract(
      token as unknown as CONTRACT_NAMES.stETH | CONTRACT_NAMES.wstETH,
    );
  }

  @Logger('Views:')
  public async isAbstractAccount(account: Address): Promise<boolean> {
    try {
      const capabilities = await this.core.walletClient.getCapabilities({
        account,
      });
      return isCapabilitySupported(capabilities, this.core.chainId, 'atomic');
    } catch {
      return false;
    }
  }

  @Logger('Views:')
  public async isMultisig(_account?: AccountValue): Promise<boolean> {
    const account = await this.core.core.useAccount(_account);
    return this.core.core.isContract(account.address);
  }

  // Both internalTransaction (EOA) and internalCall (AA) reach this helper
  // only after the tx is mined and confirmed. If the caller-supplied
  // decodeResult throws, the on-chain state already changed — surface that
  // via DecodeResultError so consumers can recover hash/receipt instead of
  // collapsing a successful tx into a bare UNKNOWN_ERROR.
  private async runDecodeResult<TDecodedResult>(opts: {
    decodeResult:
      | ((receipt: ReceiptLike) => Promise<TDecodedResult>)
      | undefined;
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

  @Logger('Utils:')
  private async checkVersion(callResult: CallResult): Promise<void> {
    const contractName = this.core.getContractNameByAddress(callResult.to);
    if (!contractName) return;

    const result = await this.core.checkContractVersion(contractName);
    if (!result.supported) {
      throw new SDKError({
        code: ERROR_CODE.NOT_SUPPORTED,
        message: `Contract ${contractName} version ${result.version} not supported`,
      });
    }
  }

  private async internalTransaction<TDecodedResult = undefined>(
    props: PerformTransactionOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const {
      callback = NOOP,
      getGasLimit,
      sendTransaction,
      decodeResult,
      waitForTransactionReceiptParameters = {},
    } = props;
    const account = await this.core.core.useAccount(props.account);
    const isContract = await this.core.core.isContract(account.address);

    let overrides: TransactionOptions = {
      account,
      chain: this.core.chain,
      gas: undefined,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    };

    if (isContract) {
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
      const feeData = await this.core.core.getFeeData();
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

    if (isContract) {
      await callback({ stage: TransactionCallbackStage.MULTISIG_DONE });
      return { hash };
    }

    await callback({
      stage: TransactionCallbackStage.RECEIPT,
      payload: { hash },
    });

    const receipt = await withSDKError(
      this.core.core.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 120_000,
        ...waitForTransactionReceiptParameters,
      }),
      ERROR_CODE.TRANSACTION_ERROR,
    );

    await callback({
      stage: TransactionCallbackStage.CONFIRMATION,
      payload: { receipt, hash },
    });

    const confirmations =
      await this.core.core.publicClient.getTransactionConfirmations({
        hash: receipt.transactionHash,
      });

    const result = await this.runDecodeResult({
      decodeResult,
      receipt,
      hash,
      confirmations,
    });

    await callback({
      stage: TransactionCallbackStage.DONE,
      payload: {
        result: result as Awaited<TDecodedResult>,
        confirmations,
        receipt,
        hash,
      },
    });

    this.core.invalidateCache();

    return {
      hash,
      receipt,
      result,
      confirmations,
    };
  }

  private async internalCall<TDecodedResult = undefined>(
    props: PerformCallOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const {
      callback = NOOP,
      calls,
      decodeResult,
      waitForTransactionReceiptParameters = {},
    } = props;
    const account = await this.core.core.useAccount(props.account);

    await callback({
      stage: TransactionCallbackStage.SIGN,
      payload: { gas: undefined },
    });

    const callData = await withSDKError(
      this.core.walletClient.sendCalls({
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
      this.core.walletClient.waitForCallsStatus({
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
      | WalletCallReceipt<bigint, 'success' | 'reverted'>
      | undefined;

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

    const confirmations = txHash
      ? await this.core.publicClient.getTransactionConfirmations({
          hash: txHash,
        })
      : 0n;

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

    this.core.invalidateCache();

    return {
      hash: txHash,
      receipt: receipt as any,
      result,
      confirmations,
    };
  }

  public async perform<TDecodedResult = undefined>(
    props: PerformOptionsSpend<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>>;
  public async perform<TDecodedResult = undefined>(
    props: PerformOptionsNoSpend<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>>;

  @Logger('Call:')
  @ErrorHandler()
  public async perform<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const account = await this.core.core.useAccount(props.account);
    const isAA = await this.isAbstractAccount(account.address);
    if (isAA) {
      return this.performCall(props);
    }

    return this.performTransaction(props);
  }

  private async performCall<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const calls: Call[] = [];
    const approveCall = await this.getApproveCallIfNeeded(props);
    if (approveCall) {
      calls.push(approveCall);
    }

    const call = await this.prepareCall(props);
    await this.checkVersion(call);
    calls.push(call);

    return this.internalCall({
      ...props,
      calls,
    });
  }

  private async performTransaction<TDecodedResult = undefined>(
    props: PerformOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    const { hash, permit } = await this.getPermit(props);
    if (hash) return { hash };

    const call = await this.prepareCall(props, { permit });
    await this.checkVersion(call);
    return this.internalTransaction({
      ...props,
      ...this.callToInternalTransaction(call),
    });
  }

  private async prepareCall(
    props: PerformOptions<any>,
    options?: { permit?: PermitSignatureShort },
  ) {
    const account = await this.core.core.useAccount(props.account);

    // options is well prepared outside
    return props.call({
      from: account.address,
      permit: EMPTY_PERMIT,
      ...options,
    } as any);
  }

  private callToInternalTransaction(call: CallResult): {
    getGasLimit: PerformTransactionGasLimit;
    sendTransaction: PerformTransactionSendTransaction;
  } {
    return {
      getGasLimit: this.callToGetGasLimit(call),
      sendTransaction: this.callToSendTransaction(call),
    };
  }

  private callToGetGasLimit(call: CallResult): PerformTransactionGasLimit {
    return (options) =>
      this.core.publicClient.estimateGas({
        ...options,
        to: call.to,
        data: call.data,
        value: call.value,
      });
  }

  private callToSendTransaction(
    call: CallResult,
  ): PerformTransactionSendTransaction {
    return (options) =>
      this.core.walletClient.sendTransaction({
        ...options,
        to: call.to,
        data: call.data,
        value: call.value,
      });
  }

  // Permit and Approve methods

  private async getPermit(props: PerformOptions<any>) {
    if (!props.spend) {
      return {};
    }

    const { permit } = props.spend;

    if (permit) return { permit: stripPermit(permit) };

    const result = await this.signPermitOrApprove(props);

    return {
      hash: result.hash,
      permit: stripPermit(result.permit),
    };
  }

  private async getApproveCallIfNeeded(props: PerformOptions<any>) {
    if (!props.spend) {
      return undefined;
    }

    const { needsApprove } = await this.checkAllowance(props);
    if (!needsApprove) return undefined;

    return this.getApproveCall(props.spend);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async allowance({
    account: accountProp,
    token,
  }: AllowanceProps): Promise<bigint> {
    const account = await this.core.core.useAccount(accountProp);
    const contract = this.getTokenContract(token);

    return contract.read.allowance([account.address, this.spender]);
  }

  @Logger('Utils:')
  public async checkAllowance(
    props: SignPermitOrApproveProps,
  ): Promise<CheckAllowanceResult> {
    const { amount, token } = parseSpendingProps(props.spend);
    if (amount === 0n) {
      return {
        allowance: 0n,
        needsApprove: false,
      };
    }
    const allowance = await this.allowance({ token, account: props.account });
    const needsApprove = allowance < amount;
    return {
      allowance,
      needsApprove,
    };
  }

  @Logger('Permit:')
  @ErrorHandler()
  public async signPermit(props: SignPermitOrApproveProps) {
    const { token, amount, deadline } = parseSpendingProps(props.spend);

    await props.callback?.({
      stage: TransactionCallbackStage.PERMIT_SIGN,
      payload: { token, amount },
    });

    return this.core.core.signPermit({
      amount,
      token,
      deadline,
      spender: this.spender,
      account: props.account,
    });
  }

  @Logger('Call:')
  @ErrorHandler()
  public async approve(
    props: SignPermitOrApproveProps,
  ): Promise<TransactionResult> {
    const call = await this.getApproveCall(props.spend);

    return this.internalTransaction({
      ...props,
      ...this.callToInternalTransaction(call),
    });
  }

  private async getApproveCall(props: AmountAndTokenProps) {
    const { amount, token } = parseSpendingProps(props);
    return this.getTokenContract(token).encode.approve([this.spender, amount]);
  }

  @Logger('Utils:')
  public async signPermitOrApprove(props: SignPermitOrApproveProps) {
    const [{ needsApprove }, isMultisig] = await Promise.all([
      this.checkAllowance(props),
      this.isMultisig(props.account),
    ]);

    if (!needsApprove) {
      return { permit: EMPTY_PERMIT };
    }

    if (isMultisig) {
      const { hash } = await this.approve({
        ...props,
        callback: this.wrapApproveCallback(props),
      });
      return { permit: EMPTY_PERMIT, hash };
    } else {
      const permit = await this.signPermit(props);
      return { permit };
    }
  }

  private wrapApproveCallback({
    callback,
    spend,
  }: SignPermitOrApproveProps): TransactionCallback | undefined {
    if (!callback) return undefined;
    const { token, amount } = parseSpendingProps(spend);
    return (args) => {
      switch (args.stage) {
        case TransactionCallbackStage.SIGN:
          return callback({
            stage: TransactionCallbackStage.APPROVE_SIGN,
            payload: { token, amount },
          });
        case TransactionCallbackStage.RECEIPT:
          return callback({
            stage: TransactionCallbackStage.APPROVE_RECEIPT,
            payload: { token, amount, hash: (args.payload as any).hash },
          });
        case TransactionCallbackStage.MULTISIG_DONE:
          return callback(args);
        default:
      }
    };
  }
}
