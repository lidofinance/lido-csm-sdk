import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createWalletClient,
  erc20Abi,
  http,
  parseEther,
  toHex,
  type WalletClient,
} from 'viem';
import { TOKENS } from '../../src';
import { CONTRACT_NAMES } from '../../src/common';
import {
  ALLOWANCE_BASE_SLOT,
  allowanceSlot,
} from '../../src/allowance-sdk/allowance-override';
import { PERMIT_GAS_OVERHEAD } from '../../src/tx-sdk/consts';
import {
  anvilChainId,
  anvilRpcUrl,
  chainById,
  makeCsmSdk,
  mintStETH,
  mintWstETH,
  useAccount,
  useAltAccount,
  useCsmSdkWithWallet,
  usePublicClient,
  useTestClient,
  useWalletClient,
} from '../helpers';

const OPERATOR_ID = 0n;
const MIN_BYTECODE = '0x60006000' as const;
const MULTISIG_SEED = 0xe5_71_b0n;
const AMOUNT = parseEther('1');
const TOKEN_LIST = [TOKENS.steth, TOKENS.wsteth] as const;
type Erc20 = (typeof TOKEN_LIST)[number];

const mint = (walletClient: WalletClient, token: Erc20) =>
  token === TOKENS.steth
    ? mintStETH(walletClient, parseEther('100'))
    : mintWstETH(walletClient, parseEther('100'));

describe('integration: estimate-wallet', () => {
  let snapshotId: `0x${string}`;

  beforeEach(async () => {
    snapshotId = await useTestClient().snapshot();
    await useTestClient().setBalance({
      address: useAccount().address,
      value: parseEther('1000'),
    });
  });

  afterEach(async () => {
    await useTestClient().revert({ id: snapshotId });
  });

  it.each(TOKEN_LIST)(
    'ALLOWANCE_BASE_SLOT matches the %s allowances mapping',
    async (token) => {
      const sdk = useCsmSdkWithWallet();
      const wallet = useWalletClient();
      const owner = useAccount().address;
      const spender = sdk.core.getContractAddress(CONTRACT_NAMES.accounting);
      const tokenAddress = sdk.core.getContractAddress(
        token === TOKENS.steth ? CONTRACT_NAMES.stETH : CONTRACT_NAMES.wstETH,
      );

      const hash = await wallet.writeContract({
        account: useAccount(),
        chain: wallet.chain,
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, 12_345n],
      });
      await useTestClient().waitForTransactionReceipt({ hash });

      const stored = await usePublicClient().getStorageAt({
        address: tokenAddress,
        slot: allowanceSlot({
          owner,
          spender,
          baseSlot: ALLOWANCE_BASE_SLOT[token],
        }),
      });
      expect(stored).toBe(toHex(12_345n, { size: 32 }));
    },
  );

  it('ETH estimate bounds the real addBondETH gasUsed', async () => {
    const sdk = useCsmSdkWithWallet();
    const props = {
      token: TOKENS.eth,
      nodeOperatorId: OPERATOR_ID,
      amount: AMOUNT,
    } as const;

    const estimate = await sdk.bond.estimateAddBond(props);
    const { receipt } = await sdk.bond.addBondETH(props);
    const gasUsed = receipt!.gasUsed;

    expect(estimate.unlock).toBeUndefined();
    expect(estimate.total).toBe(estimate.main);
    expect(estimate.walletKind).toBe('eoa');
    expect(estimate.main).toBeGreaterThanOrEqual(gasUsed);
    expect(estimate.main).toBeLessThanOrEqual((gasUsed * 125n) / 100n);
  });

  it.each(TOKEN_LIST)(
    '%s estimate with zero allowance resolves with a permit unlock',
    async (token) => {
      const sdk = useCsmSdkWithWallet();
      await mint(useWalletClient(), token);

      const estimate = await sdk.bond.estimateAddBond({
        token,
        nodeOperatorId: OPERATOR_ID,
        amount: AMOUNT,
      });

      expect(estimate.main).toBeGreaterThan(0n);
      expect(estimate.unlock?.kind).toBe('permit');
      expect(estimate.unlock?.gas).toBe(PERMIT_GAS_OVERHEAD[token]);
      expect(estimate.walletKind).toBe('eoa');
    },
  );

  it.each(TOKEN_LIST)(
    '%s PERMIT_GAS_OVERHEAD is within 15% of the measured permit cost',
    async (token) => {
      const sdk = useCsmSdkWithWallet();
      await mint(useWalletClient(), token);
      const props = { token, nodeOperatorId: OPERATOR_ID, amount: AMOUNT };

      const permit = await sdk.tx.signPermit({
        spend: { token, amount: AMOUNT },
      });
      const withPermit = await sdk.bond.estimateAddBond({ ...props, permit });
      const override = await sdk.bond.estimateAddBond(props);
      const measured = withPermit.main - override.main;

      console.info(
        `permit overhead ${token}: withPermit=${withPermit.main} override=${override.main} measured=${measured}`,
      );

      expect(withPermit.unlock).toBeUndefined();
      const constant = PERMIT_GAS_OVERHEAD[token];
      expect(measured).toBeGreaterThanOrEqual((constant * 85n) / 100n);
      expect(measured).toBeLessThanOrEqual((constant * 115n) / 100n);
    },
    60_000,
  );

  describe('multisig', () => {
    it('stETH zero allowance yields an approve unlock with live gas', async () => {
      const test = useTestClient();
      const account = useAltAccount(MULTISIG_SEED);
      const walletClient = createWalletClient({
        account,
        chain: chainById(anvilChainId()),
        transport: http(anvilRpcUrl()),
      });
      const sdk = makeCsmSdk(usePublicClient(), walletClient);

      await test.setBalance({
        address: account.address,
        value: parseEther('1000'),
      });
      await mintStETH(walletClient, parseEther('100'));
      await test.setCode({ address: account.address, bytecode: MIN_BYTECODE });

      const estimate = await sdk.bond.estimateAddBond({
        token: TOKENS.steth,
        nodeOperatorId: OPERATOR_ID,
        amount: AMOUNT,
      });

      expect(estimate.walletKind).toBe('multisig');
      expect(estimate.unlock?.kind).toBe('approve');
      expect(estimate.unlock!.gas).toBeGreaterThan(0n);
      expect(estimate.total).toBe(estimate.main + estimate.unlock!.gas);
    });
  });
});
