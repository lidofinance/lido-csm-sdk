<div style="display: flex;" align="center">
  <h1 align="center">Lido CSM SDK</h1>
</div>

<div style="display: flex;" align="center">
   <a href="https://github.com/lidofinance/lido-csm-sdk/blob/main/LICENSE.txt"><img alt="GitHub license" src="https://img.shields.io/github/license/lidofinance/lido-csm-sdk?color=limegreen"></a>
   <a href="https://www.npmjs.com/package/@lidofinance/lido-csm-sdk"><img alt="Downloads npm" src="https://img.shields.io/npm/dm/@lidofinance/lido-csm-sdk?color=limegreen"></a>
   <a href="https://www.npmjs.com/package/@lidofinance/lido-csm-sdk"><img alt="Version npm" src="https://img.shields.io/npm/v/@lidofinance/lido-csm-sdk?label=version"></a>
   <a href="https://www.npmjs.com/package/@lidofinance/lido-csm-sdk"><img alt="npm bundle size" src="https://img.shields.io/bundlephobia/min/@lidofinance/lido-csm-sdk"></a>
   <a href="https://github.com/lidofinance/lido-csm-sdk"><img alt="GitHub top language" src="https://img.shields.io/github/languages/top/lidofinance/lido-csm-sdk"></a>
   <a href="https://github.com/lidofinance/lido-csm-sdk/pulls"><img alt="GitHub Pull Requests" src="https://img.shields.io/github/issues-pr/lidofinance/lido-csm-sdk"></a>
   <a href="https://github.com/lidofinance/lido-csm-sdk/issues"><img alt="GitHub open issues" src="https://img.shields.io/github/issues/lidofinance/lido-csm-sdk"></a>
</div>
<br/>

**Lido CSM SDK** is a TypeScript/JavaScript library that provides a comprehensive set of tools for interacting with [Lido Community Staking Module (CSM)](https://github.com/lidofinance/community-staking-module) and Curated Module (CM) contracts on the Ethereum network. The SDK abstracts the complexity of direct contract interaction, offering a modular, extensible, and developer-friendly interface for building applications on top of Lido staking modules.

## Installation

You can install the Lido CSM SDK using npm or yarn:

```bash
yarn add @lidofinance/lido-csm-sdk @lidofinance/lido-ethereum-sdk viem
```

or

```bash
npm install @lidofinance/lido-csm-sdk @lidofinance/lido-ethereum-sdk viem
```

## Usage

To get started with the Lido CSM SDK, you need to import the necessary modules:

```ts
import { LidoSDKCsm, LidoSDKCm } from '@lidofinance/lido-csm-sdk';
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
```

## Initialization

The SDK provides two classes for different module types:
- **LidoSDKCsm**: For Community Staking Module (permissionless/ICS entry)
- **LidoSDKCm**: For Curated Module (gate-based allowlist entry)

### CSM (Community Staking Module)

```ts
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSDKCsm } from '@lidofinance/lido-csm-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Initialize core SDK first
const rpcProvider = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const core = new LidoSDKCore({
  chainId: mainnet.id,
  rpcProvider,
});

// Create CSM SDK instance
const csmSdk = new LidoSDKCsm({ core });
```

### CM (Curated Module)

```ts
import { LidoSDKCm } from '@lidofinance/lido-csm-sdk';

// Create Curated Module SDK instance
const cmSdk = new LidoSDKCm({ core });
```

## Examples

### CSM Examples

```ts
const csmSdk = new LidoSDKCsm({ core });

// Query operator information
const operatorsCount = await csmSdk.module.getOperatorsCount();
const operator = await csmSdk.operator.getInfo(69n);

// Manage keys
const keys = await csmSdk.keys.getKeys(operatorId);

// CSM-specific: Create operator via permissionless gate
await csmSdk.permissionlessGate.createNodeOperator(...);
```

### CM Examples

```ts
const cmSdk = new LidoSDKCm({ core });

// Query operator information (same as CSM)
const operatorsCount = await cmSdk.module.getOperatorsCount();
const operator = await cmSdk.operator.getInfo(69n);

// CM-specific: Create operator via curated gate
await cmSdk.curatedGates.createNodeOperator(gateIndex, proof, ...);

// CM-specific: Manage operator metadata
await cmSdk.operatorsData.set(operatorId, { name, description });
```

## SDK Modules

The SDK provides two classes: **`LidoSDKCsm`** for Community Staking Module and **`LidoSDKCm`** for Curated Module. Each aggregates a set of modules tailored to their specific use cases.

### Shared Modules (Available in Both)

These modules are available in both `LidoSDKCsm` and `LidoSDKCm`:

- **core**: Core SDK for shared logic, configuration, and utilities
- **tx**: Unified transaction handling with multi-wallet support (EOA, multisig, Abstract Accounts)
- **module**: Query module status, share limit
- **operator**: Query operator data
- **keys**: Manage operator keys
- **keysCache**: Pubkey caching to prevent double-submission
- **keysWithStatus**: Query operator keys with status tracking
- **bond**: Manage operator bond balance
- **rewards**: Query reward distribution
- **events**: Query protocol events
- **accounting**: Access accounting data
- **parameters**: Read curve parameters
- **frame**: Query protocol frame config
- **depositQueue**: Query deposit queue pointers, batches
- **depositData**: Parse and validate deposit data JSON
- **feesMonitoring**: Validator fee recipient monitoring
- **discovery**: Operator discovery and pagination (renamed from satellite)

### CSM-Specific Modules

Only available in `LidoSDKCsm`:

- **strikes**: Query operator penalties
- **stealing**: Manage execution layer rewards stealing penalties
- **permissionlessGate**: Permissionless operator creation
- **icsGate**: ICS (Independent Community Staker) vetted entry point
- **roles**: Standard role management

### CM-Specific Modules

Only available in `LidoSDKCm`:

- **curatedGates**: Collection of curated gates for allowlist-based operator creation
- **operatorsData**: Operator metadata management (name, description)
- **roles**: Curated-specific role management (CuratedRolesSDK)

For detailed documentation, see [packages/csm-sdk/README.md](packages/csm-sdk/README.md).

## Documentation

For detailed documentation, see [packages/csm-sdk/README.md](packages/csm-sdk/README.md).

## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.
