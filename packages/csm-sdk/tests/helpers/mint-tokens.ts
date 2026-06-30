import { erc20Abi, type Hex, type WalletClient } from 'viem';
import { CONTRACT_NAMES } from '../../src/common';
import { useCsmSdk } from './use-csm-sdk';
import { usePublicClient } from './use-public-client';
import { useTestClient } from './use-test-client';

// anvil_setBalance only sets the native ETH balance — it cannot mint
// share-based ERC20s like stETH/wstETH. Both tokens expose a payable
// `receive()` that mints to the sender (stETH submits; wstETH submits +
// wraps), so funding is just "send ETH to the token contract".
//
// Each mint sends from the wallet client's own account, waits for the
// receipt, and returns the resulting token balance so callers can assert
// they have enough to spend. Token addresses are resolved through the SDK
// so the helper tracks any address change in one place.

const tokenAddress = (name: CONTRACT_NAMES): Hex =>
  useCsmSdk().core.getContractAddress(name) as Hex;

const mintViaReceive = async (
  walletClient: WalletClient,
  token: Hex,
  ethValue: bigint,
): Promise<bigint> => {
  const account = walletClient.account;
  if (!account) throw new Error('mint-tokens: walletClient has no account');

  const hash = await walletClient.sendTransaction({
    account,
    chain: walletClient.chain ?? null,
    to: token,
    value: ethValue,
  });
  await useTestClient().waitForTransactionReceipt({ hash });

  return usePublicClient().readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account.address],
  });
};

/** Mint stETH to the wallet's account by submitting `ethValue` ETH. Returns the new stETH balance. */
export const mintStETH = (
  walletClient: WalletClient,
  ethValue: bigint,
): Promise<bigint> =>
  mintViaReceive(walletClient, tokenAddress(CONTRACT_NAMES.stETH), ethValue);

/** Mint wstETH to the wallet's account by submitting+wrapping `ethValue` ETH. Returns the new wstETH balance. */
export const mintWstETH = (
  walletClient: WalletClient,
  ethValue: bigint,
): Promise<bigint> =>
  mintViaReceive(walletClient, tokenAddress(CONTRACT_NAMES.wstETH), ethValue);
