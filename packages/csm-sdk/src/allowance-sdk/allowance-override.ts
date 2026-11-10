import {
  type Address,
  concat,
  type Hex,
  keccak256,
  pad,
  type StateOverride,
  toHex,
} from 'viem';
import { Erc20Tokens, TOKENS } from '../common/index';
import type { AllowanceOverrideProps } from './types';

/** Storage slot of the `allowances` mapping; pinned by an integration test. A wrong slot is detected per call (`NOT_SUPPORTED`). */
export const ALLOWANCE_BASE_SLOT: Record<Erc20Tokens, bigint> = {
  [TOKENS.steth]: 1n,
  [TOKENS.wsteth]: 1n,
};

const word = (value: Hex): Hex => pad(value, { size: 32 });

/** Slot of `allowances[owner][spender]` for a nested `mapping(address => mapping(address => uint256))`. */
export const allowanceSlot = ({
  owner,
  spender,
  baseSlot,
}: {
  owner: Address;
  spender: Address;
  baseSlot: bigint;
}): Hex => {
  const ownerSlot = keccak256(concat([word(owner), word(toHex(baseSlot))]));
  return keccak256(concat([word(spender), ownerSlot]));
};

/** `stateOverride` making `allowances[account][spender]` of `tokenAddress` read exactly `amount`. */
export const buildAllowanceOverride = ({
  tokenAddress,
  token,
  account,
  spender,
  amount,
}: AllowanceOverrideProps & { tokenAddress: Address }): StateOverride => [
  {
    address: tokenAddress,
    stateDiff: [
      {
        slot: allowanceSlot({
          owner: account,
          spender,
          baseSlot: ALLOWANCE_BASE_SLOT[token],
        }),
        value: toHex(amount, { size: 32 }),
      },
    ],
  },
];
