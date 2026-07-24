import type { Address } from 'viem';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module';
import { CURATED_GATES } from '../common/constants/contract-names';
import {
  Access,
  AccessLevel,
  ErrorHandler,
  Logger,
} from '../common/decorators/index';
import { ERROR_CODE, invariant } from '../common/index';
import { CuratedGateSDK } from '../curated-gate-sdk/curated-gate-sdk';
import { TxSDK } from '../tx-sdk/index';
import type {
  CreateNodeOperatorInGateProps,
  GateItemEligibility,
} from './types';

export class CuratedGatesCollectionSDK extends CsmSDKModule<{
  tx: TxSDK;
}> {
  private readonly gates: Map<CURATED_GATES, CuratedGateSDK> = new Map();

  constructor(props: CsmSDKProps, name?: string) {
    super(props, name);

    for (const gateName of CURATED_GATES) {
      this.gates.set(gateName, new CuratedGateSDK(props, gateName));
    }
  }

  public getCount(): number {
    return this.gates.size;
  }

  public getAll(): ReadonlyMap<CURATED_GATES, CuratedGateSDK> {
    return this.gates;
  }

  public get(gateName: CURATED_GATES): CuratedGateSDK | undefined {
    return this.gates.get(gateName);
  }

  @Logger('Utils:')
  @ErrorHandler()
  public getOrThrow(gateName: CURATED_GATES): CuratedGateSDK {
    const gate = this.gates.get(gateName);
    invariant(gate, `Gate ${gateName} not found`, ERROR_CODE.NOT_SUPPORTED);
    return gate;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getEligibility(
    address: Address,
  ): Promise<GateItemEligibility[]> {
    return Promise.all(
      Array.from(this.gates, async ([gateName, gate]) => {
        const eligibility = await gate.getEligibility(address);
        return {
          ...eligibility,
          gateName,
        };
      }),
    );
  }

  @Access({ level: AccessLevel.ANYONE })
  @Logger('Call:')
  @ErrorHandler()
  public async createNodeOperator(props: CreateNodeOperatorInGateProps) {
    const { gateName, ...gateProps } = props;

    const gate = this.getOrThrow(gateName);

    return gate.createNodeOperator(gateProps);
  }
}
