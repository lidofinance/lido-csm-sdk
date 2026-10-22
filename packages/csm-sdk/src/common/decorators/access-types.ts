export enum AccessLevel {
  /** No restriction — any address can call */
  ANYONE = 'ANYONE',
  /** Operator's manager address */
  MANAGER = 'MANAGER',
  /** Operator's reward address */
  REWARDS = 'REWARDS',
  /** Manager when extendedManagerPermissions is enabled, reward address otherwise */
  OWNER = 'OWNER',
  /** Address proposed as the new manager (two-phase address change) */
  PROPOSED_MANAGER = 'PROPOSED_MANAGER',
  /** Address proposed as the new reward address (two-phase address change) */
  PROPOSED_REWARDS = 'PROPOSED_REWARDS',
  /** Manager, reward address, or custom rewards claimer */
  CLAIMER = 'CLAIMER',
  /** OpenZeppelin AccessControl role (system-level, not per-operator) */
  PROTOCOL_ROLE = 'PROTOCOL_ROLE',
}

export type AccessCondition = {
  extendedManagerPermissions?: boolean;
};

export type ProtocolRole =
  'REPORT_GENERAL_DELAYED_PENALTY_ROLE' | 'ENABLE_TOP_UP_ALLOCATION_ROLE';

export type MethodAccess = {
  level: AccessLevel;
  condition?: AccessCondition;
  protocolRole?: ProtocolRole;
};

export type PublicMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];
