import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module.js';
import { CURATED_GATES } from '../common/constants/contract-names.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { CuratedGateSDK } from '../curated-gate-sdk/curated-gate-sdk.js';
import { TxSDK } from '../tx-sdk/index.js';
import type {
  CreateNodeOperatorInGateProps,
  GateItemEligibility,
} from './types.js';

export class CuratedGatesCollectionSDK extends CsmSDKModule<{
  tx: TxSDK;
}> {
  private gates: CuratedGateSDK[] = [];

  constructor(props: CsmSDKProps, name?: string) {
    super(props, name);

    // Initialize gate instances for each gate name
    for (const gateName of CURATED_GATES) {
      try {
        const gateSdk = new CuratedGateSDK(props, gateName);
        this.gates.push(gateSdk);
      } catch (error) {
        console.warn(`Failed to initialize gate ${gateName}:`, error);
      }
    }

    invariant(
      this.gates.length > 0,
      'No gates configured',
      ERROR_CODE.NOT_SUPPORTED,
    );
  }

  public getCount(): number {
    return this.gates.length;
  }

  public getAll(): ReadonlyArray<CuratedGateSDK> {
    return this.gates;
  }

  public get(index: number): CuratedGateSDK | undefined {
    return this.gates[index];
  }

  @Logger('Utils:')
  @ErrorHandler()
  public getOrThrow(index: number): CuratedGateSDK {
    const gate = this.gates[index];
    invariant(
      gate,
      `Gate at index ${index} not found`,
      ERROR_CODE.NOT_SUPPORTED,
    );
    return gate;
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getEligibility(
    address: Address,
  ): Promise<GateItemEligibility[]> {
    return Promise.all(
      this.gates.map(async (gate, gateIndex) => {
        const eligibility = await gate.getEligibility(address);

        return {
          ...eligibility,
          gateIndex,
        };
      }),
    );
  }

  // Operator creation in specific gate

  @Logger('Call:')
  @ErrorHandler()
  public async createNodeOperator(props: CreateNodeOperatorInGateProps) {
    const { gateIndex, ...gateProps } = props;

    const gate = this.getOrThrow(gateIndex);

    return gate.createNodeOperator(gateProps);
  }
}
