import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { PerSupportedChain, SUPPORTED_CHAINS } from './supported-chains';
import { MODULE_NAME } from './module-name';

export enum OPERATOR_TYPE {
  CSM_DEF = 'CSM_DEF',
  CSM_LEA = 'CSM_LEA',
  CSM_ICS = 'CSM_ICS',
  CSM_IDVTC = 'CSM_IDVTC',
  CSM2_DEF = 'CSM2_DEF',
  CM_PO = 'CM_PO',
  CM_PTO = 'CM_PTO',
  CM_PGO = 'CM_PGO',
  CM_DO = 'CM_DO',
  CM_EEO = 'CM_EEO',
  CM_IODC = 'CM_IODC',
  CM_IODCP = 'CM_IODCP',
}

export type OperatorTypeInfo = {
  module: MODULE_NAME;
  /** `undefined` = gate not deployed on that chain yet. Every supported chain must be listed. */
  curveId: PerSupportedChain<bigint | undefined>;
};

export const OPERATOR_TYPE_INFO = {
  [OPERATOR_TYPE.CSM_DEF]: {
    module: MODULE_NAME.CSM,
    curveId: { [CHAINS.Mainnet]: 0n, [CHAINS.Hoodi]: 0n },
  },
  [OPERATOR_TYPE.CSM_LEA]: {
    module: MODULE_NAME.CSM,
    curveId: { [CHAINS.Mainnet]: 1n, [CHAINS.Hoodi]: 1n },
  },
  [OPERATOR_TYPE.CSM_ICS]: {
    module: MODULE_NAME.CSM,
    curveId: { [CHAINS.Mainnet]: 2n, [CHAINS.Hoodi]: 2n },
  },
  [OPERATOR_TYPE.CSM_IDVTC]: {
    module: MODULE_NAME.CSM,
    curveId: { [CHAINS.Mainnet]: 3n, [CHAINS.Hoodi]: 4n },
  },
  [OPERATOR_TYPE.CSM2_DEF]: {
    module: MODULE_NAME.CSM_02,
    curveId: { [CHAINS.Mainnet]: 0n, [CHAINS.Hoodi]: 0n },
  },
  [OPERATOR_TYPE.CM_PO]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 0n, [CHAINS.Hoodi]: 0n },
  },
  [OPERATOR_TYPE.CM_PTO]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 1n, [CHAINS.Hoodi]: 1n },
  },
  [OPERATOR_TYPE.CM_PGO]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 2n, [CHAINS.Hoodi]: 2n },
  },
  [OPERATOR_TYPE.CM_DO]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 3n, [CHAINS.Hoodi]: 3n },
  },
  [OPERATOR_TYPE.CM_EEO]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 4n, [CHAINS.Hoodi]: 4n },
  },
  [OPERATOR_TYPE.CM_IODC]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 5n, [CHAINS.Hoodi]: 5n },
  },
  [OPERATOR_TYPE.CM_IODCP]: {
    module: MODULE_NAME.CM,
    curveId: { [CHAINS.Mainnet]: 6n, [CHAINS.Hoodi]: 6n },
  },
} satisfies Record<OPERATOR_TYPE, OperatorTypeInfo>;

/** Operator types belonging to module `M` (type-level). */
export type OperatorTypeOfModule<M extends MODULE_NAME> = {
  [K in OPERATOR_TYPE]: (typeof OPERATOR_TYPE_INFO)[K]['module'] extends M
    ? K
    : never;
}[OPERATOR_TYPE];

/** Curve id scoped to its module; ids collide across modules and are meaningless alone. */
export type CurveRef<M extends MODULE_NAME = MODULE_NAME> = {
  curveId: bigint;
  module: M;
};

export type CurveRefsByOperatorType = Partial<Record<OPERATOR_TYPE, CurveRef>>;

const buildCurveRefsByChain =
  (): PerSupportedChain<CurveRefsByOperatorType> => {
    const table = {} as PerSupportedChain<CurveRefsByOperatorType>;
    for (const chainId of SUPPORTED_CHAINS) {
      const refs: CurveRefsByOperatorType = {};
      for (const operatorType of Object.values(OPERATOR_TYPE)) {
        const { module, curveId } = OPERATOR_TYPE_INFO[operatorType];
        const id = curveId[chainId];
        if (id !== undefined) refs[operatorType] = { curveId: id, module };
      }
      table[chainId] = refs;
    }
    return table;
  };

/** Per chain: operator type → curve ref. Absent key = gate not deployed on that chain. */
export const OPERATOR_TYPE_CURVE_REFS: PerSupportedChain<CurveRefsByOperatorType> =
  buildCurveRefsByChain();
