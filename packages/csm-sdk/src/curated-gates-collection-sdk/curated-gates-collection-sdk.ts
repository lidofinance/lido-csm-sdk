import { ERROR_CODE, invariant } from '@lidofinance/lido-ethereum-sdk';
import type { Address } from 'viem';
import {
  CsmSDKModule,
  CsmSDKProps,
} from '../common/class-primitives/csm-sdk-module.js';
import { CuratedGates } from '../common/constants/contract-names.js';
import { ErrorHandler, Logger } from '../common/decorators/index.js';
import { Proof } from '../common/types.js';
import { CuratedGateSDK } from '../curated-gate-sdk/curated-gate-sdk.js';
import { AddressProof } from '../ics-gate-sdk/types.js';
import { TxSDK } from '../tx-sdk/index.js';
import type { CreateNodeOperatorInGateProps } from './types.js';

export class CuratedGatesCollectionSDK extends CsmSDKModule<{
  tx: TxSDK;
}> {
  private gates: CuratedGateSDK[] = [];

  constructor(props: CsmSDKProps, name?: string) {
    super(props, name);

    // Initialize gate instances for each gate name
    for (const gateName of CuratedGates) {
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

  public async getAllCurveIds(): Promise<bigint[]> {
    return Promise.all(this.gates.map(async (gate) => await gate.getCurveId()));
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getProofs(address: Address): Promise<(Proof | null)[]> {
    return Promise.all(
      this.gates.map(async (gate) => {
        const proof = await gate.getProof(address);
        if (!proof) return null;

        return proof;
      }),
    );
  }

  @Logger('Utils:')
  @ErrorHandler()
  public async getProofAndConsumed(
    address: Address,
  ): Promise<(AddressProof | null)[]> {
    return Promise.all(
      this.gates.map(async (gate) => {
        const result = await gate.getProofAndConsumed(address);
        if (!result.proof) return null;

        return result;
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
