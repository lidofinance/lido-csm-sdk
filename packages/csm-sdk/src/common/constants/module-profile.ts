import { CHAINS } from '@lidofinance/lido-ethereum-sdk';
import { CONTRACT_NAMES } from './contract-names';
import { MODULE_NAME, PerModule } from './module-name';
import { PerSupportedChain, SUPPORTED_CHAINS } from './supported-chains';

export type ContractVersionRange = readonly [min: bigint, max: bigint];
export type MerkleTreeFallbacks = PerSupportedChain<
  Partial<Record<CONTRACT_NAMES, string>>
>;

/** Static per-module, per-chain facts: which contract is the module, which features it has, which artifacts it ships. */
export type ModuleProfileConfig = {
  moduleContract: CONTRACT_NAMES;
  /** Keys wait in a deposit queue before activation. */
  depositQueue: boolean;
  /** Separate top-up queue for already-deposited 0x02 keys. */
  topUpQueue: boolean;
  /** Per-key allocated balances (0x02 variable effective balance). */
  allocatedBalance: boolean;
  contractVersions: Partial<Record<CONTRACT_NAMES, ContractVersionRange>>;
  merkleTreeFallbacks: MerkleTreeFallbacks;
  /** Rewards report logs published before on-chain history existed. */
  reportV1LogCids?: Partial<PerSupportedChain<readonly string[]>>;
};

/** Per-module facts resolved to one chain; see `resolveModuleProfile`. */
export type ModuleProfile = Omit<
  ModuleProfileConfig,
  'merkleTreeFallbacks' | 'reportV1LogCids'
> & {
  merkleTreeFallbacks: Partial<Record<CONTRACT_NAMES, string>>;
  reportV1LogCids: readonly string[];
};

const SM_ARTIFACTS =
  'https://raw.githubusercontent.com/lidofinance/staking-modules/develop/artifacts';
const SM_REWARDS = 'https://raw.githubusercontent.com/lidofinance/csm-rewards';
const CM_REWARDS =
  'https://raw.githubusercontent.com/lidofinance/cm-v2-rewards';

const SHARED_VERSIONS = {
  [CONTRACT_NAMES.accounting]: [3n, 3n],
  [CONTRACT_NAMES.feeDistributor]: [3n, 3n],
  [CONTRACT_NAMES.parametersRegistry]: [3n, 3n],
  [CONTRACT_NAMES.validatorStrikes]: [1n, 1n],
} satisfies ModuleProfileConfig['contractVersions'];

const CSM_VERSIONS = {
  ...SHARED_VERSIONS,
  [CONTRACT_NAMES.csModule]: [3n, 3n],
  [CONTRACT_NAMES.icsGate]: [1n, 1n],
  [CONTRACT_NAMES.idvtcGate]: [1n, 1n],
} satisfies ModuleProfileConfig['contractVersions'];

export const MODULE_PROFILE: PerModule<ModuleProfileConfig> = {
  [MODULE_NAME.CSM]: {
    moduleContract: CONTRACT_NAMES.csModule,
    depositQueue: true,
    topUpQueue: false,
    allocatedBalance: false,
    contractVersions: CSM_VERSIONS,
    merkleTreeFallbacks: {
      [CHAINS.Mainnet]: {
        [CONTRACT_NAMES.icsGate]: `${SM_ARTIFACTS}/mainnet/ics/merkle-tree.json`,
        [CONTRACT_NAMES.idvtcGate]: `${SM_ARTIFACTS}/mainnet/idvtc/merkle-tree.json`,
        [CONTRACT_NAMES.feeDistributor]: `${SM_REWARDS}/mainnet/tree.json`,
      },
      [CHAINS.Hoodi]: {
        [CONTRACT_NAMES.icsGate]: `${SM_ARTIFACTS}/hoodi/ics/merkle-tree.json`,
        [CONTRACT_NAMES.feeDistributor]: `${SM_REWARDS}/hoodi/tree.json`,
      },
    },
    reportV1LogCids: {
      [CHAINS.Mainnet]: [
        'QmezkGCHPUJ9XSAJfibmo6Sup35VgbhnodfYsc1xNT3rbo',
        'Qmb5CZUD9uLXP9LS68jnJp1v2GTF1KjYsNLJuML9fpRufE',
        'QmePUqG8tMXbv3eHDu3j56Dod4gwmGh1Vapsh7u4gxotT4',
        'QmT5JWn3sR7fYxxxSh3kHBmjZyPBWjKb6CsSLGXMQbLXMX',
        'QmWxANi2GWvoxwnPRsxwZNF6NRyjwMBPAF4bBMcL3HGG3i',
        'QmYQPDuqVbxWq2YNSZS55LE3eTeriy51HTCgBHLiW9fN7N',
        'QmeZduNqrnSMLTVE5tkNDv2WhtL3uAgHRP1915m5CHcCqM',
        'QmaHU6Ah99Yk6kQVtSrN4inxqqYoU6epZ5UKyDvwdYUKAS',
        'Qmemm9gD2fQgwNziBsf9mAaveNXJ3eJvHpqBTWKoLdUXXV',
        'QmVgGQS7QBeRMq2noqqxekY5ezmqRsgu7JjiyMyRaaWEDv',
        'QmaUC2HBv88mJ9Gf99hfNgtH4qo2F1yHaBMC4imwVhxDDi',
        'QmPPFkydgtnwMBDF6nZZaU5nnqy3csbKts3UfRRgWXreEu',
      ],
      [CHAINS.Hoodi]: [
        'QmPby8Fko4V3ehTyY5WTuSryonDUp3ZwhckhcxyZwUcMax',
        'QmaNYo36g75gPLBNBS5DinZJJzToYEbVF78FkuN2AVQJWH',
        'QmVeEcxSyNhUgfokDjJp6jHH5p2xxwVpQJvBAMnDgKJSff',
        'QmbiXqWJwFFD2V2U1BiK95wT4o2xJS1ADn5fxuUwLUnnED',
        'QmSpQT7gnPrqSRuxk8aYzkVfQKnGzyhDJLhDB8gE6iiJtB',
        'QmScZDanVNsdDQs4yWaftYP75h6kqvkBa9DtUKbcz3h2fm',
        'QmeU3NQfKDxTGDt8Rv2L7BNnQtusT28qdpwMi28yRZePER',
        'Qmda7FBh6UuHiSHfBZPn5usgtCKqEhw2A4uEgPbzC67dmY',
        'QmTs4RzisurYXvUYTGe4Br72wb4pFgjnsCud3ufXHAPZqV',
        'QmUv6Agev1xz4BVYbRRoLXjS1Gxw7buB2mGwVivcNpHg5s',
        'Qmey6xAGt4GHS2qVfg7dPK2FqUgQUoxhjc9uzXkcJxYYX1',
        'QmfM76FSg2pnPRi5hxwciDKfg2xc63bt1xM8MbjyfBv97K',
        'QmNfCxwb6rYgkqAtRchWgzpAZMBzxuVF8YPmzJZA66tgut',
        'QmXpxXz8YB2BhQTinWZvNPG612zEdaKjnWw3y2vns1siTR',
        'QmbkpDgmtRbe8vpMccGZNLPK7SpDPyRWotvvq6YCcvq4Yx',
        'QmeuDMfTSWHge597NhNnvsx73aTrnkJRkUccXYKQH1Fk3T',
        'QmNTRswhnDaeMEfxuMK7yN94v7JsW5bYrKMMJ35dV9ZJbH',
        'QmchigoC3FbXArNNcjTj4dtADcrCUZgtU2KXD5c6MHyNe3',
        'Qma8arXw9WuiXXaqdEKJm3Wzr7xwcJtmtYhu6ehEAVkhqs',
        'QmZ2W3wRA8ZDnt4PmheghCTKrwU5ZPLa3usamZy4bSuzsR',
        'QmbWPmbnVYH3SqzenQhobRT7UchmsuHsrsSi8G9HKfqpuG',
        'QmRF9bTJiNUWtKFzazumJqk5Nu8gSsYgDhEKVsbGmep79J',
        'QmaGsZbr7NfojyGEviU31CAmE4JscN43sraED6NPPQKLqy',
        'QmXUwH5FpHP13zAn2f15nEaXJDZ5nicUcL2hSbu53b3Pk2',
        'QmaBzBn8ug55hcsKpUUwhD49UcLGmXKhuRWHUtAVj7YQKU',
        'QmXKUmHeMJS6UhGnxaKbGYwMPixmNAarnrP5Vo2id6zpKH',
        'QmS9gM9NeBjdBP3nCY1SyY6uz3psX7hS5GvpQ9b2aP8pU1',
        'QmUqqwRE1tfVbWzuEhX2uERcxDpwxfEeJgZTiA5J4Gme5j',
        'QmSPmKvMxkXKFYAYxaZnHJCDM1xoW1SQUEbW1ZdpE5gHkN',
        'QmQrCWtXuAk4eL58hyuUx6qAFcFyB14ZksVZbVFJ5bXmbx',
        'QmfZ1x3PeeCeqoBR3fEam6V2zvjPZnf1Ne82jDPcKAF3qc',
        'QmZtCFuXaAvw2pUZLy5TgT8o5CrCTFDXbH9aBYjYgoJ1SW',
        'QmYCXaNHzpzN4eXUVVrRMzJSbsN4SpEa4J8VQtHLTjEirp',
        'QmPcHnT4VePXaS9rkvStuCdUeFgJ7FtjabdoyUeLT5o5Zz',
        'QmWPMbMgmYJDzYvojgFZMp81igxrUXdH3BgNVzxcKMzcuf',
        'QmTn8P65uN219dvdwFehw5zFsC3NeQ2RWYCbtpc4BTBtAB',
        'Qmeck7YCGezC7feFTjMsWseo8t49oYGCwyG2Uug82kk23Z',
        'QmNvknsCUQFDePw891JwMUaXfXjoadSZrVZwnGFsdTwCey',
        'QmVRUdATd7rcj1x2Lf4HSfMpM89UhxRgPXsVdbUoBTroUB',
        'QmZF3uC5NgJFMBdNyc7SjYCRSPeyGQrSCUL4wbq7Hj9a8T',
        'QmczEgBofYjatXn48kzhbo84H2gvcWRjR3SmgWURDoo3nG',
        'QmZ9Wqz5XC1P8udZahfsGuUDmW2tASckhgjszkdpk3tMuA',
        'QmQjCEQXptaAGEZc9u3c6Z5xqaurdAayWD8m3KmrT5ULRu',
        'QmZVvkcF1NcosAZULLgSv5WEScMaViPDJ9VtvF2zYuZwEB',
        'QmX2SHSEwK2dm7ExYapJKos8NkKBExXx6iUwyqKfRXzacj',
        'QmSAXeYsPt9u2RTC5S1GEidY5zn6kbwQohKZcQNePyRNcZ',
        'QmY4tqwtc4zNKN2h2Me3oLwhtFe2m24BiSkCfm4R1uoW6v',
        'QmVCP8chvRSp5zzQYU3oz3o3NVT9jxEDpUkxvDXrNUL1Zd',
        'QmYVysaSpaeJM8ZPVciH83bPZdj7ZfNzRigqWv4iheEG7f',
        'QmYG1WF5z2mL2YayZA45DgkpxuW2ZF1gTgdMSfBLWz7dVG',
        'QmPV7PnMfuiGdTwbwPDHwSEVHxZ8P6Rg4W9ZgQbjt11XqM',
        'QmeEXdPSju68FXnTAWaBApBxQke3r9fjGByjfGzK3twVd7',
        'QmX8BxEyauMpZ5S1yb7kuuZPwdJLMG1D7XibDj8gWSBZyx',
        'QmTFHMo65STrzi8hQVnRxeC6L7qF9qDaYYEhVWAig8xaTp',
        'QmVr4XtHYo9JoTNAEe6EaDTXoYzPS58UY4f7t19Ku6Q3t2',
        'QmNUb8nKa22WQ8AxCkgCfYE9M8o5puju5UhMcTLDMYwn2c',
        'Qmc6fobdrL7XevdNhdMHAqo4r6QTs9DRxZTJNAjCPZo8ZN',
        'QmWib2ei5dcznExvH8TP5o7JAtCWyjcGMY8tj3ctJyPC5X',
        'QmWqYkpLUjjCrufjYLABiDyN8pEyCeBJpBX5dRFeX7Eu2b',
        'QmaJVMe3jJ56DfLGqoBiHc9ScpK3sdMAVkh5n49M8EjFXj',
        'QmZpwv3mfaJVN1d1B4hRc8bQS3JZnLxVVU1mS7jpgAdy1p',
        'QmdXS3nsifpuQur564hVmAaNaKZHBdxMiJNCjxjoHshZew',
        'QmdppE8QtuF6k99MBFabHp7jVcgvEZp1E4UhvRQAgycxcy',
        'QmQXvqMb9umsYdyNEY33RePzxfBxy5kxGciba55t15akmA',
        'QmdKVgwNfPo3N42Qnu2A99491C5LgtbH11pPiG4qhWMfNh',
        'QmTutEwsUuNMhuwMrgbEc2AiqWvBPgSzgNHXjm4rAyhsSe',
        'QmZPm2YpAuAQSaBvn6AoT8YTUM5DkdJubGvjDPkwYkuHWE',
        'QmZmi9v46fsLoSKeHGeecRn5NqnH3qoBZh8oA36zcarRrm',
        'QmZLapx4Gwe3GjncgRhodF7X4YCh5TvJHXWak2L6D8zzUC',
        'QmdnUd8ZEWqzawiXh1NHPnKxQHPwBXSS9YNq2ET61i6pSD',
        'QmTpTekd8qV9mn46pYzT9fkHtYHyQguZrbGdF233YYibvY',
        'QmPC8jQtYwWcnxkdBLZg4KvJCtnWJXndciXHYSroLtQpJC',
        'QmdeNU3Pq2UPjnkZyFjZm1bXRPxmoSFqbvqkpHbqSPNdVV',
        'QmeZHjsPtntaPLryP7GrDrkRHk2L9qUioCiQeHMu6REVf5',
      ],
    },
  },
  [MODULE_NAME.CSM_02]: {
    moduleContract: CONTRACT_NAMES.csModule,
    depositQueue: true,
    topUpQueue: true,
    allocatedBalance: true,
    contractVersions: CSM_VERSIONS,
    merkleTreeFallbacks: {
      [CHAINS.Mainnet]: {},
      [CHAINS.Hoodi]: {
        [CONTRACT_NAMES.feeDistributor]: `${SM_REWARDS}/hoodi-0x02/tree.json`,
      },
    },
  },
  [MODULE_NAME.CM]: {
    moduleContract: CONTRACT_NAMES.curatedModule,
    depositQueue: false,
    topUpQueue: false,
    allocatedBalance: true,
    contractVersions: {
      ...SHARED_VERSIONS,
      [CONTRACT_NAMES.curatedModule]: [1n, 1n],
    },
    merkleTreeFallbacks: {
      [CHAINS.Mainnet]: {
        [CONTRACT_NAMES.curatedGatePTO]: `${SM_ARTIFACTS}/mainnet/curated/gates/pto/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGatePGO]: `${SM_ARTIFACTS}/mainnet/curated/gates/pgo/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateDO]: `${SM_ARTIFACTS}/mainnet/curated/gates/do/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateEEO]: `${SM_ARTIFACTS}/mainnet/curated/gates/ee/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateIODC]: `${SM_ARTIFACTS}/mainnet/curated/gates/iodvtc/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateIODCP]: `${SM_ARTIFACTS}/mainnet/curated/gates/iodvtc%2B/merkle-tree.json`,
        [CONTRACT_NAMES.feeDistributor]: `${CM_REWARDS}/mainnet/tree.json`,
      },
      [CHAINS.Hoodi]: {
        [CONTRACT_NAMES.curatedGatePTO]: `${SM_ARTIFACTS}/hoodi/curated/gates/PTO/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGatePGO]: `${SM_ARTIFACTS}/hoodi/curated/gates/PGO/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateDO]: `${SM_ARTIFACTS}/hoodi/curated/gates/DO/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateEEO]: `${SM_ARTIFACTS}/hoodi/curated/gates/EE/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateIODC]: `${SM_ARTIFACTS}/hoodi/curated/gates/IDVC/merkle-tree.json`,
        [CONTRACT_NAMES.curatedGateIODCP]: `${SM_ARTIFACTS}/hoodi/curated/gates/IDVC%2B/merkle-tree.json`,
        [CONTRACT_NAMES.feeDistributor]: `${CM_REWARDS}/hoodi/tree.json`,
      },
    },
  },
};

/** Narrows `MODULE_PROFILE[moduleName]` to a single chain. */
export const resolveModuleProfile = (
  moduleName: MODULE_NAME,
  chainId: CHAINS,
): ModuleProfile => {
  const config = MODULE_PROFILE[moduleName];
  return {
    ...config,
    merkleTreeFallbacks:
      config.merkleTreeFallbacks[chainId as SUPPORTED_CHAINS] ?? {},
    reportV1LogCids:
      config.reportV1LogCids?.[chainId as SUPPORTED_CHAINS] ?? [],
  };
};
