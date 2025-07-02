export type KeyNumberValueInterval = {
  minKeyNumber: bigint;
  value: bigint;
};

export type StrikesConfig = {
  lifetime: number;
  threshold: number;
};

export type QueueConfig = {
  lowestPriority: number;
  priority: number;
  maxDeposits: number;
};

export type BondInterval = {
  minKeysCount: bigint;
  minBond: bigint;
  trend: bigint;
};

export type PerformanceCoefficients = {
  attestationsWeight: bigint;
  blocksWeight: bigint;
  syncWeight: bigint;
};

export type CurveParameters = {
  keyRemovalFee: bigint;
  keysLimit: bigint;
  allowedExitDelay: number;
  exitDelayPenalty: bigint;
  badPerformancePenalty: bigint;
  elStealingPenalty: bigint;
  maxWithdrawalRequestFee: bigint;
  performanceCoefficients: PerformanceCoefficients;
  performanceLeewayConfig: KeyNumberValueInterval[];
  rewardsConfig: KeyNumberValueInterval[];
  bondConfig: KeyNumberValueInterval[];
  queueConfig: QueueConfig;
  strikesConfig: StrikesConfig;
};
