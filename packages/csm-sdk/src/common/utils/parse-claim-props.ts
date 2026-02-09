import { RewardProof } from '../index.js';

export const parseClaimProps = <T>(
  props: T & Partial<RewardProof>,
): T & RewardProof => {
  return { ...props, proof: props.proof ?? [], shares: props.shares ?? 0n };
};
