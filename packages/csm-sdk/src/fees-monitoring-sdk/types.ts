import { Hash, Hex } from 'viem';
import { NodeOperatorId } from '../common/types.js';

export type ValidatorInfo = Pick<
  ValidatorRegistration,
  'status' | 'lastPolledAt'
> & {
  pubkey: Hex;
};

export type ValidatorInfoIssues = ValidatorInfo & {
  status: 'NoRegistration' | 'InvalidFeeRecipient';
};

// API Request params

export type CheckOperatorKeysProps = {
  moduleId: number;
  nodeOperatorId?: NodeOperatorId;
  limit?: number;
  start?: number;
  withIssuesOnly?: boolean;
};

// API Response Types

export type ValidatorRegistrationResponse = {
  [pubkey: Hex]: ValidatorRegistration;
};

export type ValidatorRegistration = {
  id: number; // internal ID
  status:
    | 'NoRegistration'
    | 'InvalidFeeRecipient'
    | 'PollingInProgress'
    | 'RegistrationOk';
  lastPolledAt: string; // ISO date-time string
  relays: Record<string, RelayRegistrationDetails>; // relay URL -> details
};

export type RelayRegistrationDetails = {
  pubkey: Hex;
  type: 'OPTIONAL' | 'REQUIRED' | 'WATCHED' | 'NOT_VETTED';
  polledResult?: {
    message: {
      fee_recipient: Hex;
      gas_limit: `${bigint}`;
      timestamp: `${number}`;
      pubkey: Hex;
    };
    signature: Hash;
  };
  valid: boolean;
};
