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

**Lido CSM SDK** is a TypeScript/JavaScript library that provides a comprehensive set of tools for interacting with [Lido Community Staking Module (CSM)](https://github.com/lidofinance/community-staking-module) contracts on the Ethereum network. The SDK abstracts the complexity of direct contract interaction, offering a modular, extensible, and developer-friendly interface for building applications on top of Lido CSM.

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
import { LidoSDKCsm } from '@lidofinance/lido-csm-sdk';
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
```

## Initialization

Before using the SDK, you need to create an instance of the LidoSDKCsm class:

```ts
import { LidoSDKCore } from '@lidofinance/lido-ethereum-sdk';
import { LidoSDKCsm } from '@lidofinance/lido-csm-sdk';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Initialize core SDK first
const rpcProvider = createPublicClient({
  chain: mainnet
  transport: http(),
});

const core = new LidoSDKCore({
  chainId: mainnet.id,
  rpcProvider,
});

// Then create CSM SDK instance
const sdk = new LidoSDKCsm({ core });
```

## Examples

```ts
const sdk = new LidoSDKCsm({ ... });

// Query operator information
const operatorsCount = await sdk.module.getOperatorsCount();
const operator = await sdk.operator.getInfo(69n);

// Manage keys
const keys = await sdk.keys.getKeys(operatorId);
```

## SDK Modules

The `LidoSDKCsm` class aggregates the following modules:

- **core**: Core SDK for shared logic, configuration, and utilities.
- **module**: Query CSM status, share limit.
- **operator**: Query operator data.
- **keys**: Manage operator keys.
- **keysCache**: Pubkey caching to prevent double-submission.
- **bond**: Manage operator bond balance.
- **rewards**: Query reward distribution.
- **events**: Query protocol events.
- **tx**: Unified transaction handling with multi-wallet support (EOA, multisig, Abstract Accounts).
- **depositQueue**: Query deposit queue pointers, batches.
- **depositData**: Parse and validate deposit data JSON.

And more - see [packages/csm-sdk/README.md](packages/csm-sdk/README.md) for the complete list.

## Documentation

For detailed documentation, see [packages/csm-sdk/README.md](packages/csm-sdk/README.md).

## License

This project is licensed under the MIT License. See the [LICENSE.txt](LICENSE.txt) file for details.
