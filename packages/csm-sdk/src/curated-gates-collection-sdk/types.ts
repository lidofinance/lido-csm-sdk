import { CreateNodeOperatorProps, GateEligibility } from '../index';

export type GateItem<T> = T & {
  gateIndex: number;
};

export type CreateNodeOperatorInGateProps = GateItem<CreateNodeOperatorProps>;

export type GateItemEligibility = GateItem<GateEligibility>;
