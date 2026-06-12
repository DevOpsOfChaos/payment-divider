import type {
  Claim,
  ClaimEvent,
  ClaimLifecycle,
  ClaimPayment,
  Counterparty,
  CounterpartyKind,
  EntityId,
  PersonBalanceOverview,
  PersonClaimSummary,
} from "@payment-divider/core";

import type { WriteResult } from "./repositories";

// Claims data behind one interface: the local-demo session store and the
// supabase-local adapter implement the same shape, so the claims screen never
// knows which backend it talks to. Claims stay ledger notes — no payment
// execution, no payment-method storage, no reminders sent to the other side.

export interface ClaimListItem {
  claim: Claim;
  counterparty?: Counterparty;
  // Resolved display name: the counterparty record's name for own claims, the
  // creator's profile name for incoming shared claims.
  counterpartyName: string;
  groupName?: string;
  remaining: number;
  lifecycle: ClaimLifecycle;
  linked: boolean;
  // True when the current user is the linked counterparty, not the creator.
  incoming: boolean;
  // True when the current user may acknowledge/dispute this claim.
  canReact: boolean;
  payments: ClaimPayment[];
  events: ClaimEvent[];
}

export interface ClaimsOverviewData {
  summaries: PersonClaimSummary[];
  openClaims: ClaimListItem[];
  closedClaims: ClaimListItem[];
}

export interface ClaimGroupOption {
  id: EntityId;
  name: string;
}

export interface NewCounterpartyInput {
  kind: Exclude<CounterpartyKind, "app_user">;
  displayName: string;
}

export interface AddClaimInput {
  direction: Claim["direction"];
  // Either an existing counterparty id or the data for a new person record;
  // implementations reuse an existing record with the same normalized name.
  counterpartyId?: EntityId;
  newCounterparty?: NewCounterpartyInput;
  amount: number;
  purpose?: string;
  dueDate?: string;
  groupId?: EntityId;
}

export interface ClaimsRepository {
  getCounterparties(): Counterparty[];
  getClaimGroupOptions(): ClaimGroupOption[];
  getClaimsOverview(): ClaimsOverviewData;
  getPersonBalanceOverview(): PersonBalanceOverview[];
  // Dev hint while the backend is loading/unconfigured; undefined in local-demo.
  getClaimsStatusHint(): string | undefined;
  addClaim(input: AddClaimInput): Promise<WriteResult>;
  recordClaimPayment(claimId: EntityId, amount: number): Promise<WriteResult>;
  acknowledgeClaim(claimId: EntityId): Promise<WriteResult>;
  disputeClaim(claimId: EntityId): Promise<WriteResult>;
  archiveClaim(claimId: EntityId): Promise<WriteResult>;
}
