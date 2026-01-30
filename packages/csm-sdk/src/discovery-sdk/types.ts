export enum SearchMode {
  CURRENT_ADDRESSES = 0,
  PROPOSED_ADDRESSES = 1,
  ALL_ADDRESSES = 2,
}

export type Pagination = {
  offset: bigint;
  limit: bigint;
};
