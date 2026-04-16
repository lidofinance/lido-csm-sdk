import { z } from 'zod';
import { KEY_STATUS } from '../common/index';
import { parseGwei } from 'viem';

const HexSchema = z.templateLiteral([z.literal('0x'), z.string()]);

const NumericString = z.templateLiteral([z.bigint()]);

const CLStatusSchema = z.enum([
  'pending_initialized',
  'pending_queued',
  'active_ongoing',
  'active_exiting',
  'active_slashed',
  'exited_unslashed',
  'exited_slashed',
  'withdrawal_possible',
  'withdrawal_done',
]);

type CLStatus = z.infer<typeof CLStatusSchema>;

const StatusMap: Record<CLStatus, KEY_STATUS> = {
  pending_initialized: KEY_STATUS.DEPOSITABLE,
  pending_queued: KEY_STATUS.ACTIVATION_PENDING,
  active_ongoing: KEY_STATUS.ACTIVE,
  active_exiting: KEY_STATUS.EXITING,
  active_slashed: KEY_STATUS.EXITING,
  exited_unslashed: KEY_STATUS.WITHDRAWAL_PENDING,
  exited_slashed: KEY_STATUS.WITHDRAWAL_PENDING,
  withdrawal_possible: KEY_STATUS.WITHDRAWAL_PENDING,
  withdrawal_done: KEY_STATUS.WITHDRAWN,
};

const ClKeySchema = z
  .object({
    index: z.templateLiteral([z.number()]),
    balance: NumericString,
    status: CLStatusSchema,
    validator: z.object({
      pubkey: HexSchema,
      withdrawal_credentials: HexSchema,
      effective_balance: NumericString,
      slashed: z.boolean(),
      activation_eligibility_epoch: NumericString,
      activation_epoch: NumericString,
      exit_epoch: NumericString,
      withdrawable_epoch: NumericString,
    }),
  })
  .transform((key) => ({
    validatorIndex: key.index,
    pubkey: key.validator.pubkey,
    slashed: key.validator.slashed,
    status: StatusMap[key.status],
    activationEpoch: BigInt(key.validator.activation_epoch),
    effectiveBalance: parseGwei(key.validator.effective_balance),
  }));

const ClValidatorsResponseSchema = z
  .object({
    execution_optimistic: z.boolean(),
    finalized: z.boolean(),
    data: z.array(ClKeySchema),
  })
  .transform(({ data }) => data);

export type ClKeyInput = z.input<typeof ClKeySchema>;
export type ClPreparedKey = z.output<typeof ClKeySchema>;

export const parseClResponse = (text: string) =>
  ClValidatorsResponseSchema.parse(JSON.parse(text));
