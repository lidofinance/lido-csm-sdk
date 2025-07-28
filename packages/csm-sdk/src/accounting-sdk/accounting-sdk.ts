import { GetContractReturnType, WalletClient } from 'viem';
import { CSAccountingAbi } from '../abi/CSAccounting.js';
import { CsmSDKModule } from '../common/class-primitives/csm-sdk-module.js';
import { ErrorHandler } from '../common/decorators/error-handler.js';
import { Logger } from '../common/decorators/logger.js';
import { TOKENS } from '../common/index.js';
import {
  AmountByKeys,
  BondAmountByKeysCountProps,
  BondForNextKeysProps,
  KeysCountByBondAmountProps,
} from './types.js';

export class AccountingSDK extends CsmSDKModule {
  protected get contract(): GetContractReturnType<
    typeof CSAccountingAbi,
    WalletClient
  > {
    return this.core.contractCSAccounting;
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountETH({
    curveId,
    keysCount,
  }: BondAmountByKeysCountProps) {
    return this.contract.read.getBondAmountByKeysCount([keysCount, curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondAmountByKeysCountWstETH({
    curveId,
    keysCount,
  }: BondAmountByKeysCountProps) {
    return this.contract.read.getBondAmountByKeysCountWstETH([
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
  public async getCurve(curveId: bigint) {
    return this.contract.read.getCurveInfo([curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getKeysCountByBondAmount({
    amount,
    curveId,
  }: KeysCountByBondAmountProps) {
    return this.contract.read.getKeysCountByBondAmount([amount, curveId]);
  }

  @Logger('Views:')
  @ErrorHandler()
  public async getBondForNextKeysETH({
    nodeOperatorId,
    keysCount,
  }: BondForNextKeysProps) {
    return this.contract.read.getRequiredBondForNextKeys([
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
    return this.contract.read.getRequiredBondForNextKeysWstETH([
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
