import {
  MODULE_NAME,
  OPERATOR_TYPE,
  OPERATOR_TYPE_CURVE_ID,
  OPERATOR_TYPE_MODULE,
  PerModule,
  PerSupportedChain,
  SUPPORTED_CHAINS,
} from '../constants/index';

const invertCurveIds = (
  curveIds: Partial<Record<OPERATOR_TYPE, bigint>>,
): ReadonlyMap<bigint, OPERATOR_TYPE> => {
  const inverse = new Map<bigint, OPERATOR_TYPE>();
  for (const operatorType of Object.values(OPERATOR_TYPE)) {
    const curveId = curveIds[operatorType];
    if (curveId !== undefined) {
      inverse.set(curveId, operatorType);
    }
  }
  return inverse;
};

const CURVE_ID_OPERATOR_TYPE: PerSupportedChain<
  PerModule<ReadonlyMap<bigint, OPERATOR_TYPE>>
> = SUPPORTED_CHAINS.reduce(
  (byChain, chainId) => {
    byChain[chainId] = Object.values(MODULE_NAME).reduce(
      (byModule, moduleName) => {
        byModule[moduleName] = invertCurveIds(
          OPERATOR_TYPE_CURVE_ID[chainId][moduleName],
        );
        return byModule;
      },
      {} as PerModule<ReadonlyMap<bigint, OPERATOR_TYPE>>,
    );
    return byChain;
  },
  {} as PerSupportedChain<PerModule<ReadonlyMap<bigint, OPERATOR_TYPE>>>,
);

export const getCurveIdByOperatorType = (
  chainId: SUPPORTED_CHAINS,
  operatorType: OPERATOR_TYPE,
): bigint | undefined => {
  return OPERATOR_TYPE_CURVE_ID[chainId][OPERATOR_TYPE_MODULE[operatorType]][
    operatorType
  ];
};

export const getOperatorTypeByCurveId = (
  chainId: SUPPORTED_CHAINS,
  moduleName: MODULE_NAME,
  curveId: bigint | undefined,
): OPERATOR_TYPE | undefined => {
  if (curveId === undefined) return undefined;
  return CURVE_ID_OPERATOR_TYPE[chainId][moduleName].get(curveId);
};
