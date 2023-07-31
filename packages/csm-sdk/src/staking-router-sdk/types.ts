export const ShareLimitStatus = {
  FAR: 'FAR',
  APPROACHING: 'APPROACHING',
  EXHAUSTED: 'EXHAUSTED',
  REACHED: 'REACHED',
} as const;
export type ShareLimitStatus = keyof typeof ShareLimitStatus;

export type ShareLimitInfo = {
  active: bigint;
  activeLeft: bigint;
  capacity: bigint;
  queue: bigint;
};
