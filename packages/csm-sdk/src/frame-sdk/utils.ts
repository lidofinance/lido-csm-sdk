import { Block } from 'viem';
import { FrameConfig } from './types.js';

/**
 * Safety buffer in blocks for slot-to-block estimation (~33 hours at 12s/block).
 * Accounts for missed slots and clock drift when querying events by estimated block range.
 */
export const ESTIMATED_BLOCK_GAP = 10_000n;

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
  return Number(BigInt(slot) / slotsPerEpoch);
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

export const slotToApproximateBlockNumber = (
  slot: number | bigint,
  config: Pick<FrameConfig, 'secondsPerSlot' | 'genesisTime'>,
  currentBlock: Pick<Block<bigint, false, 'latest'>, 'number' | 'timestamp'>,
) => {
  const targetTimestamp = slotToTimestamp(slot, config);
  const timeDiff = currentBlock.timestamp - BigInt(targetTimestamp);
  const blockOffset = timeDiff / config.secondsPerSlot;
  return currentBlock.number - blockOffset;
};
