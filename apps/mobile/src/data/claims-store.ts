import {
  deriveClaimLifecycle,
  getClaimRemainingAmount,
  isClaimClosed,
  isLinkedClaim,
  summarizeClaimsByPerson,
  type Claim,
  type ClaimCounterpartyType,
  type ClaimEvent,
  type ClaimLifecycle,
  type ClaimPayment,
  type EntityId,
  type PersonClaimSummary,
} from "@payment-divider/core";

import {
  MOCK_CLAIM_EVENTS,
  MOCK_CLAIM_PAYMENTS,
  MOCK_CLAIMS,
} from "../mock-data/claims";
import { MOCK_CURRENT_USER_ID, MOCK_USERS } from "../mock-data/ledger";
import { notifyExternalDataChanged } from "./local-ledger";

// Session-only claims store for the local demo. Claims are private ledger
// notes: nothing here syncs, executes payments, or affects group balances.

let claims: readonly Claim[] = MOCK_CLAIMS;
let payments: readonly ClaimPayment[] = MOCK_CLAIM_PAYMENTS;
let events: readonly ClaimEvent[] = MOCK_CLAIM_EVENTS;

function nowIso(): string {
  return new Date().toISOString();
}

function appendEvent(claimId: EntityId, eventType: ClaimEvent["eventType"]): void {
  events = [
    ...events,
    {
      id: `claim-event-${Date.now()}-${events.length}`,
      claimId,
      actorUserId: MOCK_CURRENT_USER_ID,
      eventType,
      createdAt: nowIso(),
    },
  ];
}

function updateClaim(claimId: EntityId, patch: Partial<Claim>): void {
  claims = claims.map((claim) =>
    claim.id === claimId ? { ...claim, ...patch, updatedAt: nowIso() } : claim,
  );
}

export interface AddClaimInput {
  direction: Claim["direction"];
  counterpartyType: ClaimCounterpartyType;
  counterpartyUserId?: EntityId;
  counterpartyName: string;
  amount: number;
  purpose?: string;
  dueDate?: string;
  groupId?: EntityId;
}

export function addClaim(input: AddClaimInput): void {
  const id = `claim-${Date.now()}-${claims.length}`;
  claims = [
    ...claims,
    {
      id,
      creatorUserId: MOCK_CURRENT_USER_ID,
      direction: input.direction,
      counterpartyType: input.counterpartyType,
      counterpartyUserId:
        input.counterpartyType === "app_user" ? input.counterpartyUserId : undefined,
      counterpartyName: input.counterpartyName,
      amount: input.amount,
      currency: "EUR",
      purpose: input.purpose,
      claimDate: nowIso().slice(0, 10),
      dueDate: input.dueDate,
      groupId: input.groupId,
      status: input.counterpartyType === "app_user" ? "linked_open" : "private_open",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
  appendEvent(id, "claim_created");
  notifyExternalDataChanged();
}

export function recordClaimPayment(claimId: EntityId, amount: number): void {
  const claim = claims.find((candidate) => candidate.id === claimId);
  if (!claim || amount <= 0) {
    return;
  }
  payments = [
    ...payments,
    {
      id: `claim-payment-${Date.now()}-${payments.length}`,
      claimId,
      amount,
      currency: claim.currency,
      paymentDate: nowIso().slice(0, 10),
      recordedBy: MOCK_CURRENT_USER_ID,
      // Linked claims need creditor confirmation; for the demo the current
      // user is the creditor of their own claims and confirms directly.
      confirmationStatus:
        isLinkedClaim(claim) && claim.creatorUserId !== MOCK_CURRENT_USER_ID
          ? "pending_confirmation"
          : "confirmed",
      createdAt: nowIso(),
      confirmedAt: nowIso(),
    },
  ];
  appendEvent(claimId, "payment_recorded");
  notifyExternalDataChanged();
}

export function acknowledgeClaim(claimId: EntityId): void {
  updateClaim(claimId, { status: "debtor_acknowledged" });
  appendEvent(claimId, "claim_acknowledged");
  notifyExternalDataChanged();
}

export function disputeClaim(claimId: EntityId): void {
  updateClaim(claimId, { status: "disputed" });
  appendEvent(claimId, "claim_disputed");
  notifyExternalDataChanged();
}

export function archiveClaim(claimId: EntityId): void {
  updateClaim(claimId, { status: "archived", archivedAt: nowIso() });
  appendEvent(claimId, "claim_archived");
  notifyExternalDataChanged();
}

export interface ClaimListItem {
  claim: Claim;
  remaining: number;
  lifecycle: ClaimLifecycle;
  linked: boolean;
  // True when the current user is the linked counterparty, not the creator.
  incoming: boolean;
  payments: ClaimPayment[];
  events: ClaimEvent[];
}

export interface ClaimsOverviewData {
  summaries: PersonClaimSummary[];
  openClaims: ClaimListItem[];
  closedClaims: ClaimListItem[];
}

function toListItem(claim: Claim): ClaimListItem {
  const claimPayments = payments.filter((payment) => payment.claimId === claim.id);
  return {
    claim,
    remaining: getClaimRemainingAmount(claim, claimPayments),
    lifecycle: deriveClaimLifecycle(claim, claimPayments),
    linked: isLinkedClaim(claim),
    incoming: claim.creatorUserId !== MOCK_CURRENT_USER_ID,
    payments: claimPayments,
    events: events
      .filter((event) => event.claimId === claim.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };
}

export function getClaimsOverview(): ClaimsOverviewData {
  const allPayments = [...payments];
  const items = claims.map(toListItem);

  // Per-person summary from the creator perspective: incoming claims count as
  // "owed by me" against the creator of that claim.
  const summaryClaims = claims.map((claim) =>
    claim.creatorUserId === MOCK_CURRENT_USER_ID
      ? claim
      : {
          ...claim,
          direction:
            claim.direction === "owed_to_me"
              ? ("owed_by_me" as const)
              : ("owed_to_me" as const),
          counterpartyUserId: claim.creatorUserId,
          counterpartyName:
            MOCK_USERS.find((user) => user.id === claim.creatorUserId)?.displayName ??
            claim.creatorUserId,
        },
  );

  return {
    summaries: summarizeClaimsByPerson(summaryClaims, allPayments),
    openClaims: items.filter((item) => !isClaimClosed(item.claim, item.payments)),
    closedClaims: items.filter((item) => isClaimClosed(item.claim, item.payments)),
  };
}
