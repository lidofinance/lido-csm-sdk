import {
  CHAINS,
  ERROR_CODE,
  invariant,
  LidoSDKCore,
  NOOP,
  TransactionCallbackStage,
  TransactionOptions,
  TransactionResult,
  withSDKError,
} from '@lidofinance/lido-ethereum-sdk';
import {
  Abi,
  AbiEvent,
  Address,
  Chain,
  getContract,
  GetContractReturnType,
  WalletClient,
} from 'viem';
import {
  CSAccountingAbi,
  CSEjectorAbi,
  CSFeeDistributorAbi,
  CSFeeOracleAbi,
  CSModuleAbi,
  CSParametersRegistryAbi,
  CSStrikesAbi,
  CSVerifierAbi,
  HashConsensusAbi,
  PermissionlessGateAbi,
  StakingRouterAbi,
  ValidatorsExitBusOracleAbi,
  VettedGateAbi,
} from '../abi/index.js';
import { CsmSDKCacheable } from '../common/class-primitives/csm-sdk-cacheable.js';
import { Cache, ErrorHandler, Logger } from '../common/decorators/index.js';
import {
  CSM_CONTRACT_ADDRESSES,
  CSM_CONTRACT_NAMES,
  DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN,
} from '../common/index.js';
import { requestWithBlockStep } from '../common/utils/request-with-block-step.js';
import {
  CsmCoreProps,
  EventRangeProps,
  LoadEventsProps,
  PerformTransactionOptions,
} from './types.js';

export class CoreSDK extends CsmSDKCacheable {
  readonly core: LidoSDKCore;

  constructor(props: CsmCoreProps) {
    super();
    this.core = props.core;
  }

  public get chainId(): CHAINS {
    return this.core.chain.id as CHAINS;
  }

  public get chain(): Chain {
    return this.core.chain;
  }

  @Logger('Utils:')
  @Cache(30 * 60 * 1000)
  public getContractAddress(contract: CSM_CONTRACT_NAMES): Address {
    const address = CSM_CONTRACT_ADDRESSES[this.chainId]?.[contract];
    invariant(
      address,
      `CSM contracts are not supported for ${this.core.chain.name}(${this.core.chain.id})`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return address;
  }

  public getContract<T extends Abi>(
    contractName: CSM_CONTRACT_NAMES,
    abi: T,
  ): GetContractReturnType<T, WalletClient> {
    return getContract({
      address: this.getContractAddress(contractName),
      abi,
      client: {
        public: this.core.rpcProvider,
        wallet: this.core.web3Provider as WalletClient,
      },
    });
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSAccounting(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csAccounting, CSAccountingAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSEjector(): GetContractReturnType<
    typeof CSEjectorAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csEjector, CSEjectorAbi);
  }
  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSFeeDistributor(): GetContractReturnType<
    typeof CSFeeDistributorAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.csFeeDistributor,
      CSFeeDistributorAbi,
    );
  }
  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSFeeOracle(): GetContractReturnType<
    typeof CSFeeOracleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csFeeOracle, CSFeeOracleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSModule(): GetContractReturnType<
    typeof CSModuleAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csModule, CSModuleAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSParametersRegistry(): GetContractReturnType<
    typeof CSParametersRegistryAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.csParametersRegistry,
      CSParametersRegistryAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSStrikes(): GetContractReturnType<
    typeof CSStrikesAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csStrikes, CSStrikesAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractCSVerifier(): GetContractReturnType<
    typeof CSVerifierAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.csVerifier, CSVerifierAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractHashConsensus(): GetContractReturnType<
    typeof HashConsensusAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.hashConsensus, HashConsensusAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractPermissionlessGate(): GetContractReturnType<
    typeof PermissionlessGateAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.permissionlessGate,
      PermissionlessGateAbi,
    );
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractVettedGate(): GetContractReturnType<
    typeof VettedGateAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.vettedGate, VettedGateAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractStakingRouter(): GetContractReturnType<
    typeof StakingRouterAbi,
    WalletClient
  > {
    return this.getContract(CSM_CONTRACT_NAMES.stakingRouter, StakingRouterAbi);
  }

  @Logger('Contracts:')
  @Cache(30 * 60 * 1000)
  public getContractValidatorsExitBusOracle(): GetContractReturnType<
    typeof ValidatorsExitBusOracleAbi,
    WalletClient
  > {
    return this.getContract(
      CSM_CONTRACT_NAMES.validatorsExitBusOracle,
      ValidatorsExitBusOracleAbi,
    );
  }

  public async performTransaction<TDecodedResult = undefined>(
    props: PerformTransactionOptions<TDecodedResult>,
  ): Promise<TransactionResult<TDecodedResult>> {
    // this guards against not having web3Provider
    this.core.useWeb3Provider();
    const {
      callback = NOOP,
      getGasLimit,
      sendTransaction,
      decodeResult,
      waitForTransactionReceiptParameters = {},
    } = props;
    const account = await this.core.useAccount(props.account);
    const isContract = await this.core.isContract(account.address);

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
        gas: 21000n,
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
        throw this.core.error({
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
      this.core.rpcProvider.waitForTransactionReceipt({
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
      await this.core.rpcProvider.getTransactionConfirmations({
        hash: receipt.transactionHash,
      });

    const result = await decodeResult?.(receipt);

    await callback({
      stage: TransactionCallbackStage.DONE,
      payload: { result, confirmations, receipt, hash },
    });

    return {
      hash,
      receipt,
      result,
      confirmations,
    };
  }

  @Logger('Utils:')
  @ErrorHandler()
  @Cache(6 * 1000)
  public async parseEventsProps(props: EventRangeProps) {
    const step = props.step ?? 10_000;

    const toBlock = await this.core.toBlockNumber({
      block: props.toBlock ?? 'latest',
    });
    const fromBlock = props.fromBlock
      ? await this.core.toBlockNumber({
          block: props.fromBlock ?? 'latest',
        })
      : DEPLOYMENT_BLOCK_NUMBER_BY_CHAIN[this.chainId] ??
        toBlock - BigInt(step);

    return {
      fromBlock,
      toBlock,
      step,
    };
  }

  // @Logger('Events:')
  // @ErrorHandler()
  public async loadEvents<TEvent extends AbiEvent>(
    props: LoadEventsProps<TEvent>,
  ) {
    const { fromBlock, toBlock, step } = await this.parseEventsProps({
      toBlock: props.toBlock,
      fromBlock: props.fromBlock,
      step: props.step,
    });

    return requestWithBlockStep(
      step,
      fromBlock,
      toBlock,
      (fromBlock, toBlock) =>
        this.core.rpcProvider.getLogs({
          address: props.address,
          event: props.event,
          args: props.args,
          fromBlock,
          toBlock,
          strict: true,
        }),
    );
  }
}
