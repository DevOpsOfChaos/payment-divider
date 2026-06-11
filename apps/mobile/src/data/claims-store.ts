import {
  deriveClaimLifecycle,
  getClaimRemainingAmount,
  isClaimClosed,
  isLinkedClaim,
  normalizeCounterpartyName,
  summarizeClaimsByPerson,
  type Claim,
  type ClaimEvent,
  type ClaimLifecycle,
  type ClaimPayment,
  type Counterparty,
  type CounterpartyKind,
  type EntityId,
  type PersonClaimSummary,
} from "@payment-divider/core";

import {
  MOCK_CLAIM_EVENTS,
  MOCK_CLAIM_PAYMENTS,
  MOCK_CLAIMS,
  MOCK_COUNTERPARTIES,
} from "../mock-data/claims";
import { MOCK_CURRENT_USER_ID } from "../mock-data/ledger";
import { notifyExternalDataChanged } from "./local-ledger";

// Session-only claims store for the local demo. Claims reference reusable
// counterparty records; free-text persons are created once and reused.
// Nothing here syncs, executes payments, or affects group balances.

let counterparties: readonly Counterparty[] = MOCK_COUNTERPARTIES;
let claims: readonly Claim[] = MOCK_CLAIMS;
let payments: readonly ClaimPayment[] = MOCK_CLAIM_PAYMENTS;
let events: readonly ClaimEvent[] = MOCK_CLAIM_EVENTS;

function nowIso(): string {
  return new Date().toISOString();
}

function ownCounterparties(): Counterparty[] {
  return counterparties.filter(
    (counterparty) =>
      counterparty.ownerUserId === MOCK_CURRENT_USER_ID && !counterparty.archivedAt,
  );
}

export function getCounterparties(): Counterparty[] {
  return ownCounterparties();
}

export interface AddCounterpartyInput {
  kind: Exclude<CounterpartyKind, "app_user">;
  displayName: string;
}

// Creates a reusable person record. If the owner already has a counterparty
// with the same normalized name, that one is reused instead of creating a
// duplicate (creation-time reuse only — merging existing records stays a
// future, user-confirmed flow).
export function getOrCreateCounterparty(input: AddCounterpartyInput): Counterparty {
  const normalized = normalizeCounterpartyName(input.displayName);
  const existing = ownCounterparties().find(
    (counterparty) => counterparty.normalizedName === normalized,
  );
  if (existing) {
    return existing;
  }

  const created: Counterparty = {
    id: `cp-${Date.now()}-${counterparties.length}`,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: input.kind,
    displayName: input.displayName.trim(),
    normalizedName: normalized,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  counterparties = [...counterparties, created];
  return created;
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
  counterpartyId: EntityId;
  amount: number;
  purpose?: string;
  dueDate?: string;
  groupId?: EntityId;
}

export function addClaim(input: AddClaimInput): void {
  const counterparty = counterparties.find(
    (candidate) => candidate.id === input.counterpartyId,
  );
  if (!counterparty) {
    return;
  }
  const linked = counterparty.kind === "app_user";
  const id = `claim-${Date.now()}-${claims.length}`;
  claims = [
    ...claims,
    {
      id,
      creatorUserId: MOCK_CURRENT_USER_ID,
      direction: input.direction,
      counterpartyId: counterparty.id,
      // New claims against linked persons are shared by default; claims
      // against unlinked persons stay private.
      sharedWithCounterparty: linked,
      amount: input.amount,
      currency: "EUR",
      purpose: input.purpose,
      claimDate: nowIso().slice(0, 10),
      dueDate: input.dueDate,
      groupId: input.groupId,
      status: linked ? "linked_open" : "private_open",
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
        isLinkedClaim(claim, [...counterparties]) &&
        claim.creatorUserId !== MOCK_CURRENT_USER_ID
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
  counterparty?: Counterparty;
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
  const allCounterparties = [...counterparties];
  return {
    claim,
    counterparty: counterparties.find(
      (counterparty) => counterparty.id === claim.counterpartyId,
    ),
    remaining: getClaimRemainingAmount(claim, claimPayments, allCounterparties),
    lifecycle: deriveClaimLifecycle(claim, claimPayments, allCounterparties),
    linked: isLinkedClaim(claim, allCounterparties),
    incoming: claim.creatorUserId !== MOCK_CURRENT_USER_ID,
    payments: claimPayments,
    events: events
      .filter((event) => event.claimId === claim.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  };
}

export function getClaimsOverview(): ClaimsOverviewData {
  const allPayments = [...payments];
  const allCounterparties = [...counterparties];
  const items = claims.map(toListItem);

  // Per-person summary from the current user's perspective: incoming claims
  // (created by someone else against the current user) count as "owed by me"
  // and are keyed to the creator's own counterparty record for them.
  const summaryClaims = claims.map((claim) => {
    if (claim.creatorUserId === MOCK_CURRENT_USER_ID) {
      return claim;
    }
    // Re-key the incoming claim to the current user's own counterparty record
    // for the creator, when one exists.
    const ownRecordForCreator = ownCounterparties().find(
      (counterparty) => counterparty.linkedUserId === claim.creatorUserId,
    );
    return {
      ...claim,
      counterpartyId: ownRecordForCreator?.id ?? claim.counterpartyId,
      direction:
        claim.direction === "owed_to_me"
          ? ("owed_by_me" as const)
          : ("owed_to_me" as const),
    };
  });

  return {
    summaries: summarizeClaimsByPerson(summaryClaims, allPayments, allCounterparties),
    openClaims: items.filter(
      (item) => !isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
    closedClaims: items.filter((item) =>
      isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
  };
}
