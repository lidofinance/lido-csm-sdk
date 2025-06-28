import { BlockNumber, BlockTag } from 'viem';

// Events Props

export type NonPendingBlockTag = Exclude<BlockTag, 'pending'>;
export type EventRangeProps = {
  step?: number;
  fromBlock?: BlockNumber | NonPendingBlockTag;
  toBlock?: BlockNumber | NonPendingBlockTag;
};
