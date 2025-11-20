export type FrameConfig = {
  slotsPerEpoch: bigint;
  secondsPerSlot: bigint;
  genesisTime: bigint;
  epochsPerFrame: bigint;
};

export type FrameInfo = {
  /**
   * Timestamp in seconds of last oracle report
   */
  lastReport: number;
  /**
   * Duration of frame in seconds
   */
  frameDuration: number;
};

export type CurrentFrameInfo = {
  /**
   * Timestamp in seconds of last block
   */
  now: number;
  /**
   * Timestamp in seconds of start of current frame
   */
  start: number;
  /**
   *  Timestamp in seconds of end of current frame
   */
  end: number;
  /**
   * Count of passed epochs since start of current frame
   */
  passEpochs: number;
};
