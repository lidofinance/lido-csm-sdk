import { GateEligibility } from '../common/index';
import { CURATED_GATES } from '../common/constants/contract-names';
import { CreateNodeOperatorProps } from '../curated-gate-sdk/types';

export type GateItem<T> = T & {
  gateName: CURATED_GATES;
};

export type CreateNodeOperatorInGateProps = GateItem<CreateNodeOperatorProps>;

export type GateItemEligibility = GateItem<GateEligibility>;
