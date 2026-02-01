import { CreateNodeOperatorProps, GateEligibility } from '../index.js';

export type GateItem<T> = T & {
  gateIndex: number;
};

export type CreateNodeOperatorInGateProps = GateItem<CreateNodeOperatorProps>;

export type GateItemEligibility = GateItem<GateEligibility>;
