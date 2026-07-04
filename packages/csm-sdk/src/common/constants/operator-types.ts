import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { PerSupportedChain } from './supported-chains';

export enum OPERATOR_TYPE {
  CSM_DEF = 'CSM_DEF',
  CSM_LEA = 'CSM_LEA',
  CSM_ICS = 'CSM_ICS',
  CSM_IDVTC = 'CSM_IDVTC',
  CM_PO = 'CM_PO',
  CM_PTO = 'CM_PTO',
  CM_PGO = 'CM_PGO',
  CM_DO = 'CM_DO',
  CM_EEO = 'CM_EEO',
  CM_IODC = 'CM_IODC',
  CM_IODCP = 'CM_IODCP',
  CC = 'CC',
}

export const OPERATOR_TYPE_CURVE_ID: PerSupportedChain<
  Record<OPERATOR_TYPE, bigint | undefined>
> = {
  [CHAINS.Mainnet]: {
    [OPERATOR_TYPE.CSM_DEF]: 0n,
    [OPERATOR_TYPE.CSM_LEA]: 1n,
    [OPERATOR_TYPE.CSM_ICS]: 2n,
    [OPERATOR_TYPE.CSM_IDVTC]: 3n,
    [OPERATOR_TYPE.CM_PO]: 0n,
    [OPERATOR_TYPE.CM_PTO]: 1n,
    [OPERATOR_TYPE.CM_PGO]: 2n,
    [OPERATOR_TYPE.CM_DO]: 3n,
    [OPERATOR_TYPE.CM_EEO]: 4n,
    [OPERATOR_TYPE.CM_IODC]: 5n,
    [OPERATOR_TYPE.CM_IODCP]: 6n,
    [OPERATOR_TYPE.CC]: undefined,
  },
  [CHAINS.Hoodi]: {
    [OPERATOR_TYPE.CSM_DEF]: 0n,
    [OPERATOR_TYPE.CSM_LEA]: 1n,
    [OPERATOR_TYPE.CSM_ICS]: 2n,
    [OPERATOR_TYPE.CSM_IDVTC]: 4n,
    [OPERATOR_TYPE.CM_PO]: 0n,
    [OPERATOR_TYPE.CM_PTO]: 1n,
    [OPERATOR_TYPE.CM_PGO]: 2n,
    [OPERATOR_TYPE.CM_DO]: 3n,
    [OPERATOR_TYPE.CM_EEO]: 4n,
    [OPERATOR_TYPE.CM_IODC]: 5n,
    [OPERATOR_TYPE.CM_IODCP]: 6n,
    [OPERATOR_TYPE.CC]: undefined,
  },
};
