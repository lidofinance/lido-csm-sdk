import { describe, it, expect } from 'vitest';
import {
  parseReport,
  isRewardsReportV1,
  isRewardsReportV2,
  isRewardsReportV2Array,
} from '../../../src/rewards-sdk/parse-report';
import { findOperatorRewards } from '../../../src/rewards-sdk/find-operator-rewards';
import {
  findProofAndAmount,
  EMPTY_PROOF,
} from '../../../src/rewards-sdk/find-proof';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

const BLOCKSTAMP = {
  block_hash: '0xaabb',
  block_number: 100,
  block_timestamp: 1_700_000_000,
  ref_epoch: 200,
  ref_slot: 6400,
  slot_number: 6400,
  state_root: '0xccdd',
};

const V1_REPORT = {
  blockstamp: BLOCKSTAMP,
  distributable: 1000,
  frame: [0, 100],
  threshold: 0.9,
  operators: {
    '0': {
      distributed: 500,
      validators: {
        '0': { perf: { assigned: 10, included: 10 }, slashed: false },
        '1': { perf: { assigned: 10, included: 8 }, slashed: false },
        '2': { perf: { assigned: 10, included: 10 }, slashed: true },
      },
    },
  },
};

const V2_REPORT = {
  blockstamp: BLOCKSTAMP,
  distributable: 1000,
  distributed_rewards: 800,
  rebate_to_protocol: 200,
  frame: [0, 100],
  operators: {
    '0': {
      distributed_rewards: 400,
      performance_coefficients: {
        attestations_weight: 0.5,
        blocks_weight: 0.3,
        sync_weight: 0.2,
      },
      validators: {
        '0': {
          attestation_duty: { assigned: 10, included: 10 },
          distributed_rewards: 200,
          performance: 0.95,
          proposal_duty: { assigned: 1, included: 1 },
          rewards_share: 0.5,
          slashed: false,
          strikes: 0,
          sync_duty: { assigned: 5, included: 5 },
          threshold: 0.8,
        },
        '1': {
          attestation_duty: { assigned: 10, included: 5 },
          distributed_rewards: 100,
          performance: 0.5,
          proposal_duty: { assigned: 0, included: 0 },
          rewards_share: 0.25,
          slashed: false,
          strikes: 1,
          sync_duty: { assigned: 0, included: 0 },
          threshold: 0.8,
        },
      },
    },
  },
};

describe('parseReport', () => {
  it('parses V1 report', () => {
    const result = parseReport(JSON.stringify(V1_REPORT));
    expect(isRewardsReportV1(result)).toBe(true);
  });

  it('parses V2 report', () => {
    const result = parseReport(JSON.stringify(V2_REPORT));
    expect(isRewardsReportV2(result)).toBe(true);
  });

  it('parses V2 array', () => {
    const result = parseReport(JSON.stringify([V2_REPORT]));
    expect(isRewardsReportV2Array(result)).toBe(true);
  });

  it('throws for invalid data', () => {
    expect(() => parseReport('{}')).toThrow();
  });
});

describe('isRewardsReportV1 / V2 / V2Array', () => {
  it('V1 type guard works', () => {
    const report = parseReport(JSON.stringify(V1_REPORT));
    expect(isRewardsReportV1(report)).toBe(true);
    expect(isRewardsReportV2(report)).toBe(false);
    expect(isRewardsReportV2Array(report)).toBe(false);
  });

  it('V2 type guard works', () => {
    const report = parseReport(JSON.stringify(V2_REPORT));
    expect(isRewardsReportV2(report)).toBe(true);
    expect(isRewardsReportV1(report)).toBe(false);
  });

  it('V2 array type guard works', () => {
    const report = parseReport(JSON.stringify([V2_REPORT]));
    expect(isRewardsReportV2Array(report)).toBe(true);
    expect(isRewardsReportV1(report)).toBe(false);
    expect(isRewardsReportV2(report)).toBe(false);
  });
});

describe('findOperatorRewards', () => {
  it('finds V1 operator rewards with threshold filtering', () => {
    const report = parseReport(JSON.stringify(V1_REPORT));
    const result = findOperatorRewards(0n, report);

    expect(result.shares).toBe(500n);
    expect(result.validatorsCount).toBe(3);
    // validator 0: 10/10=1.0 >= 0.9 ✓, validator 1: 8/10=0.8 < 0.9 ✗, validator 2: slashed ✗
    expect(result.validatorsOverThresholdCount).toBe(1);
    expect(result.threshold).toBe(0.9);
  });

  it('returns empty for missing V1 operator', () => {
    const report = parseReport(JSON.stringify(V1_REPORT));
    const result = findOperatorRewards(99n, report);
    expect(result.shares).toBe(0n);
    expect(result.validatorsCount).toBe(0);
    expect(result.threshold).toBe(0.9);
  });

  it('finds V2 operator rewards', () => {
    const report = parseReport(JSON.stringify(V2_REPORT));
    const result = findOperatorRewards(0n, report);

    expect(result.shares).toBe(400n);
    expect(result.validatorsCount).toBe(2);
    // validator 0: performance 0.95 >= threshold 0.8, not slashed ✓
    // validator 1: performance 0.5 < threshold 0.8 ✗
    expect(result.validatorsOverThresholdCount).toBe(1);
  });

  it('finds V2 array operator rewards (uses last report)', () => {
    const report = parseReport(JSON.stringify([V2_REPORT]));
    const result = findOperatorRewards(0n, report);
    expect(result.shares).toBe(400n);
    expect(result.validatorsCount).toBe(2);
  });

  it('returns empty for missing V2 operator', () => {
    const report = parseReport(JSON.stringify(V2_REPORT));
    const result = findOperatorRewards(99n, report);
    expect(result.shares).toBe(0n);
    expect(result.validatorsCount).toBe(0);
  });

  it('throws for unknown report format', () => {
    expect(() => findOperatorRewards(0n, 'invalid' as any)).toThrow(
      'Unknown rewards report version',
    );
  });
});

describe('findProofAndAmount', () => {
  it('returns EMPTY_PROOF for null tree', () => {
    expect(findProofAndAmount(null, 0n)).toEqual(EMPTY_PROOF);
  });

  it('returns proof and shares for matching operator', () => {
    const leaves: [bigint, bigint][] = [
      [0n, 100n],
      [1n, 200n],
    ];
    const tree = StandardMerkleTree.of(leaves, ['uint256', 'uint256']);
    const result = findProofAndAmount(tree, 1n);

    expect(result.shares).toBe(200n);
    expect(result.proof.length).toBeGreaterThan(0);
  });

  it('returns EMPTY_PROOF for non-matching operator', () => {
    const leaves: [bigint, bigint][] = [
      [0n, 100n],
      [1n, 200n],
    ];
    const tree = StandardMerkleTree.of(leaves, ['uint256', 'uint256']);
    const result = findProofAndAmount(tree, 99n);
    expect(result).toEqual(EMPTY_PROOF);
  });

  it('returns proof for single-leaf tree', () => {
    const leaves: [bigint, bigint][] = [[5n, 500n]];
    const tree = StandardMerkleTree.of(leaves, ['uint256', 'uint256']);
    const result = findProofAndAmount(tree, 5n);
    expect(result.shares).toBe(500n);
  });
});
