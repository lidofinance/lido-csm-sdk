import { FrameConfig } from './types';

export const slotToTimestamp = (
  slot: number | bigint,
  {
    secondsPerSlot,
    genesisTime,
  }: Pick<FrameConfig, 'secondsPerSlot' | 'genesisTime'>,
) => {
  return Number(BigInt(slot) * secondsPerSlot + genesisTime);
};

export const timestampToSlot = (
  timestamp: number | bigint,
  {
    genesisTime,
    secondsPerSlot,
  }: Pick<FrameConfig, 'genesisTime' | 'secondsPerSlot'>,
) => {
  return (BigInt(timestamp) - genesisTime) / secondsPerSlot;
};

export const slotToEpoch = (
  slot: number | bigint,
  { slotsPerEpoch }: Pick<FrameConfig, 'slotsPerEpoch'>,
) => {
  return BigInt(slot) / slotsPerEpoch;
};

export const epochToSlot = (
  epoch: number | bigint,
  { slotsPerEpoch }: Pick<FrameConfig, 'slotsPerEpoch'>,
) => {
  return BigInt(epoch) * slotsPerEpoch;
};

export const epochToTimestamp = (
  epoch: number | bigint,
  config: Pick<FrameConfig, 'slotsPerEpoch' | 'secondsPerSlot' | 'genesisTime'>,
) => {
  const slot = epochToSlot(epoch, config);
  return slotToTimestamp(slot, config);
};

export const getSlotsPerFrame = ({
  epochsPerFrame,
  slotsPerEpoch,
}: Pick<FrameConfig, 'epochsPerFrame' | 'slotsPerEpoch'>) => {
  return epochsPerFrame * slotsPerEpoch;
};

export const getFrameDuration = ({
  epochsPerFrame,
  slotsPerEpoch,
  secondsPerSlot,
}: Pick<
  FrameConfig,
  'epochsPerFrame' | 'secondsPerSlot' | 'slotsPerEpoch'
>) => {
  return Number(epochsPerFrame * slotsPerEpoch * secondsPerSlot);
};

export const getFrameStartSlot = ({
  latestSlot,
  refSlot,
  slotsPerFrame,
}: {
  latestSlot: bigint;
  refSlot: bigint;
  slotsPerFrame: bigint;
}) => {
  const diff = latestSlot - refSlot;
  let frames = diff / slotsPerFrame;
  if (diff % slotsPerFrame < 0n) frames -= 1n;
  return refSlot + frames * slotsPerFrame;
};
