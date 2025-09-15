import type { Hex } from 'viem';
import { NodeOperatorId } from '../common/types.js';

export interface RelayInfo {
  pubkey: string;
  url: string;
  type: 'OPTIONAL' | 'REQUIRED' | 'WATCHED' | 'NOT_VETTED';
  removed: boolean;
}

export interface RelayRegistrationDetails {
  pubkey: string;
  type: number;
  polledResult?: {
    message: {
      fee_recipient: string;
      gas_limit: string;
      timestamp: string;
      pubkey: string;
    };
    signature: string;
  };
  valid: boolean;
}

export interface ValidatorRegistration {
  status:
    | 'NoRegistration'
    | 'InvalidFeeRecipient'
    | 'PollingInProgress'
    | 'RegistrationOk';
  lastPolledAt: string;
  relays: Record<string, RelayRegistrationDetails>;
}

export interface OperatorKeysProps {
  nodeOperatorId?: NodeOperatorId;
  limit?: number;
  start?: number;
  withIssuesOnly?: boolean;
}

export interface CheckOperatorKeysProps {
  moduleId: number;
  nodeOperatorId?: NodeOperatorId;
  limit?: number;
  start?: number;
  withIssuesOnly?: boolean;
}

export interface CheckKeysProps {
  moduleId: number;
  pubkeys: Hex[];
}

export interface FeeRecipientIssue {
  pubkey: string;
  status: string;
  expectedFeeRecipient: string;
  actualFeeRecipient?: string;
  relays: string[];
}

// API Response Types
export interface GetRelaysResponse {
  data: RelayInfo[];
}

export interface ValidatorRegistrationResponse {
  [pubkey: string]: ValidatorRegistration;
}
