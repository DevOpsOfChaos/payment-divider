import type {
  CurrencyCode,
  EntityId,
  ISODateString,
  ISODateTimeString,
} from "./domain-types";

// Private claims / personal IOU notes (see docs/product/private-claims-v0.1.md).
// A claim is a ledger note between the creator and one counterparty. It never
// initiates payments and never changes group balances; it only aggregates in
// the per-person summary.

export type ClaimDirection = "owed_to_me" | "owed_by_me";

export type ClaimCounterpartyType = "app_user" | "invited_person" | "free_text_person";

export type ClaimStatus =
  | "draft"
  | "private_open"
  | "linked_open"
  | "debtor_acknowledged"
  | "disputed"
  | "partially_paid"
  | "marked_paid"
  | "creditor_confirmed"
  | "settled"
  | "archived";

export interface Claim {
  id: EntityId;
  creatorUserId: EntityId;
  direction: ClaimDirection;
  counterpartyType: ClaimCounterpartyType;
  counterpartyUserId?: EntityId;
  counterpartyName: string;
  amount: number;
  currency: CurrencyCode;
  purpose?: string;
  claimDate: ISODateString;
  dueDate?: ISODateString;
  groupId?: EntityId;
  contextId?: EntityId;
  status: ClaimStatus;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  archivedAt?: ISODateTimeString;
}

export type ClaimPaymentConfirmationStatus =
  | "recorded"
  | "pending_confirmation"
  | "confirmed"
  | "rejected";

export interface ClaimPayment {
  id: EntityId;
  claimId: EntityId;
  amount: number;
  currency: CurrencyCode;
  paymentDate: ISODateString;
  note?: string;
  recordedBy: EntityId;
  confirmationStatus: ClaimPaymentConfirmationStatus;
  createdAt: ISODateTimeString;
  confirmedAt?: ISODateTimeString;
  rejectedAt?: ISODateTimeString;
}

export type ClaimEventType =
  | "claim_created"
  | "claim_linked"
  | "claim_acknowledged"
  | "claim_disputed"
  | "claim_clarified"
  | "payment_recorded"
  | "payment_confirmed"
  | "payment_rejected"
  | "claim_marked_paid"
  | "claim_settled"
  | "claim_archived"
  | "reminder_set"
  | "reminder_cleared";

export interface ClaimEvent {
  id: EntityId;
  claimId: EntityId;
  actorUserId?: EntityId;
  eventType: ClaimEventType;
  createdAt: ISODateTimeString;
}

// Derived lifecycle view on top of the explicit status field.
export type ClaimLifecycle =
  | "open"
  | "partially_paid"
  | "settled"
  | "disputed"
  | "archived";

function assertIntegerAmount(amount: number, fieldName: string): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be an integer in the smallest currency unit.`);
  }
}

export function isLinkedClaim(claim: Claim): boolean {
  return claim.counterpartyType === "app_user" && claim.counterpartyUserId !== undefined;
}

// Binding paid amount: for linked claims only creditor-confirmed payments
// count; for private claims (invited/free-text) recorded payments count too.
// Pending and rejected payments never reduce the remainder.
export function getClaimPaidAmount(claim: Claim, payments: ClaimPayment[]): number {
  assertIntegerAmount(claim.amount, "claim amount");
  const linked = isLinkedClaim(claim);

  return payments
    .filter((payment) => payment.claimId === claim.id)
    .filter((payment) => {
      if (payment.currency !== claim.currency) {
        throw new Error(`Claim payment currency must match claim currency for claim ${claim.id}.`);
      }
      assertIntegerAmount(payment.amount, "claim payment amount");
      if (payment.confirmationStatus === "confirmed") {
        return true;
      }
      return !linked && payment.confirmationStatus === "recorded";
    })
    .reduce((sum, payment) => sum + payment.amount, 0);
}

export function getClaimRemainingAmount(claim: Claim, payments: ClaimPayment[]): number {
  return Math.max(claim.amount - getClaimPaidAmount(claim, payments), 0);
}

export function deriveClaimLifecycle(claim: Claim, payments: ClaimPayment[]): ClaimLifecycle {
  if (claim.status === "archived" || claim.archivedAt) {
    return "archived";
  }
  if (claim.status === "disputed") {
    return "disputed";
  }

  const remaining = getClaimRemainingAmount(claim, payments);
  if (remaining === 0) {
    if (!isLinkedClaim(claim) || claim.status === "creditor_confirmed" || claim.status === "settled") {
      return "settled";
    }
    // Linked claim fully paid but not yet creditor-confirmed: still in progress.
    return "partially_paid";
  }

  return remaining < claim.amount ? "partially_paid" : "open";
}

export function isClaimClosed(claim: Claim, payments: ClaimPayment[]): boolean {
  const lifecycle = deriveClaimLifecycle(claim, payments);
  return lifecycle === "settled" || lifecycle === "archived";
}

export interface FilterClaimsInput {
  claims: Claim[];
  payments: ClaimPayment[];
  includeClosed?: boolean;
}

export function filterVisibleClaims(input: FilterClaimsInput): Claim[] {
  if (input.includeClosed) {
    return [...input.claims];
  }
  return input.claims.filter((claim) => !isClaimClosed(claim, input.payments));
}

export interface PersonClaimSummary {
  counterpartyKey: string;
  counterpartyName: string;
  currency: CurrencyCode;
  openOwedToMe: number;
  openOwedByMe: number;
  netAmount: number;
  openClaimCount: number;
}

// One row per counterparty and currency, open claims only. Linked persons are
// keyed by user id, unlinked ones by their free-text name.
export function summarizeClaimsByPerson(
  claims: Claim[],
  payments: ClaimPayment[],
): PersonClaimSummary[] {
  const summaries = new Map<string, PersonClaimSummary>();

  for (const claim of claims) {
    if (isClaimClosed(claim, payments)) {
      continue;
    }
    const remaining = getClaimRemainingAmount(claim, payments);
    if (remaining === 0) {
      continue;
    }

    const personKey = claim.counterpartyUserId ?? `name:${claim.counterpartyName}`;
    const key = `${claim.currency}:${personKey}`;
    const existing = summaries.get(key) ?? {
      counterpartyKey: personKey,
      counterpartyName: claim.counterpartyName,
      currency: claim.currency,
      openOwedToMe: 0,
      openOwedByMe: 0,
      netAmount: 0,
      openClaimCount: 0,
    };

    if (claim.direction === "owed_to_me") {
      existing.openOwedToMe += remaining;
    } else {
      existing.openOwedByMe += remaining;
    }
    existing.netAmount = existing.openOwedToMe - existing.openOwedByMe;
    existing.openClaimCount += 1;
    summaries.set(key, existing);
  }

  return [...summaries.values()].sort(
    (left, right) =>
      left.currency.localeCompare(right.currency) ||
      left.counterpartyName.localeCompare(right.counterpartyName),
  );
}
