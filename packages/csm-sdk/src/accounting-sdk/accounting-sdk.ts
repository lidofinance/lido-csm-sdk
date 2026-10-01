import { stethSharesAbi } from '@lidofinance/lido-ethereum-sdk';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module';
import { Cache } from '../common/decorators/cache';
import { Dedupe } from '../common/decorators/dedupe';
import { ErrorHandler } from '../common/decorators/error-handler';
import { Logger } from '../common/decorators/logger';
import { CACHE_IMMUTABLE, CONTRACT_NAMES, TOKENS } from '../common/index';
import { convertEthToShares, convertSharesToEth } from './convert-shares';
import {
  AmountByKeys,
  BondAmountByKeysCountProps,
  BondForNextKeysProps,
  KeysCountByBondAmountProps,
  StethPoolData,
} from './types';

export class AccountingSDK extends CsmSDKModule {
  private get accountingContract() {
    return this.core.getContract(CONTRACT_NAMES.accounting);
  }

  @Cache(CACHE_IMMUTABLE)
  private get stethContract() {
    return this.core.getContractWithAbi(CONTRACT_NAMES.stETH, stethSharesAbi);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getStethPoolData(blockNumber?: bigint): Promise<StethPoolData> {
    const effectiveBlockNumber = this.core.skipHistoricalCalls
      ? undefined
      : blockNumber;

    return effectiveBlockNumber === undefined
      ? this.getStethPoolDataLatest()
      : this.getStethPoolDataAt(effectiveBlockNumber);
  }

  @Cache(CACHE_IMMUTABLE)
  private async getStethPoolDataAt(blockNumber: bigint) {
    return this.readStethPoolData(blockNumber);
  }

  @Dedupe()
  private async getStethPoolDataLatest() {
    return this.readStethPoolData(undefined);
  }

  private async readStethPoolData(
    blockNumber: bigint | undefined,
  ): Promise<StethPoolData> {
    const [totalPooledEther, totalShares] = await Promise.all([
      this.stethContract.read.getTotalPooledEther({ blockNumber }),
      this.stethContract.read.getTotalShares({ blockNumber }),
    ]);

    return { totalPooledEther, totalShares };
  }

  @Logger('Utils:')
  public async getStethPoolDataByBlockNumbers(blockNumbers: bigint[]) {
    return new Map(
      await Promise.all(
        blockNumbers.map(
          async (blockNumber) =>
            [blockNumber, await this.getStethPoolData(blockNumber)] as const,
        ),
      ),
    );
  }

  /**
   * Converts stETH shares to ETH amount using the current pool ratio.
   * Also works for converting wstETH to stETH.
   */
  @Logger('Views:')
  @ErrorHandler()
  public async sharesToEth(amount: bigint, blockNumber?: bigint) {
    const poolData = await this.getStethPoolData(blockNumber);
    return convertSharesToEth(amount, poolData);
  }

  /**
   * Converts ETH amount to stETH shares using the current pool ratio.
   * Also works for converting stETH to wstETH.
   */
  @Logger('Views:')
  @ErrorHandler()
  public async ethToShares(amount: bigint, blockNumber?: bigint) {
    const poolData = await this.getStethPoolData(blockNumber);
    return convertEthToShares(amount, poolData);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountETH({
    curveId,
    keysCount,
  }: BondAmountByKeysCountProps) {
    return this.accountingContract.read.getBondAmountByKeysCount([
      keysCount,
      curveId,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountWstETH({
    curveId,
    keysCount,
  }: BondAmountByKeysCountProps) {
    return this.accountingContract.read.getBondAmountByKeysCountWstETH([
      keysCount,
      curveId,
    ]);
  }

  public async getBondAmountByKeysCountPerToken(
    props: BondAmountByKeysCountProps,
  ): Promise<AmountByKeys> {
    const [eth, wsteth] = await Promise.all([
      this.getBondAmountByKeysCountETH(props),
      this.getBondAmountByKeysCountWstETH(props),
    ]);

    return {
      [TOKENS.eth]: eth,
      [TOKENS.steth]: eth,
      [TOKENS.wsteth]: wsteth,
    };
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysCountByBondAmount({
    amount,
    curveId,
  }: KeysCountByBondAmountProps) {
    return this.accountingContract.read.getKeysCountByBondAmount([
      amount,
      curveId,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondForNextKeysETH({
    nodeOperatorId,
    keysCount,
  }: BondForNextKeysProps) {
    return this.accountingContract.read.getRequiredBondForNextKeys([
      nodeOperatorId,
      keysCount,
    ]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondForNextKeysWstETH({
    nodeOperatorId,
    keysCount,
  }: BondForNextKeysProps) {
    return this.accountingContract.read.getRequiredBondForNextKeysWstETH([
      nodeOperatorId,
      keysCount,
    ]);
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getBondForNextKeysPerToken(props: BondForNextKeysProps) {
    const [eth, wsteth] = await Promise.all([
      this.getBondForNextKeysETH(props),
      this.getBondForNextKeysWstETH(props),
    ]);

    return {
      [TOKENS.eth]: eth,
      [TOKENS.steth]: eth,
      [TOKENS.wsteth]: wsteth,
    };
  }
}
