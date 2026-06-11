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

import { isCounterpartyLinked, type Counterparty } from "./counterparties";

export type ClaimDirection = "owed_to_me" | "owed_by_me";

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
  // Stable reference into the central counterparty layer (counterparties.ts)
  // instead of raw per-claim free-text person data.
  counterpartyId: EntityId;
  // Privacy gate: a claim is visible to a linked counterparty only when the
  // creator explicitly shared it. Linking a counterparty to an app user never
  // flips this on existing claims.
  sharedWithCounterparty: boolean;
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

// Self-set per-user reminder metadata (claim_reminders table, see
// docs/product/reminder-policy-v0.1.md). Reminders are personal: each side
// sets their own, independent of any due date, and they are never sent on the
// other side's behalf. Metadata only — no push/delivery in MVP 1B.
export interface ClaimReminder {
  id: EntityId;
  claimId: EntityId;
  userId: EntityId;
  remindAt: ISODateTimeString;
  note?: string;
  createdAt: ISODateTimeString;
  disabledAt?: ISODateTimeString;
}

export function isReminderActive(reminder: ClaimReminder): boolean {
  return reminder.disabledAt === undefined;
}

// Reminders due for one user at a given time. Disabled reminders never fire;
// other users' reminders are never visible or due for this user.
export function getDueReminders(
  reminders: ClaimReminder[],
  userId: EntityId,
  at: ISODateTimeString,
): ClaimReminder[] {
  return reminders.filter(
    (reminder) =>
      reminder.userId === userId &&
      isReminderActive(reminder) &&
      reminder.remindAt <= at,
  );
}

// "Später erinnern": moves the reminder forward without losing it.
export function snoozeReminder(
  reminder: ClaimReminder,
  remindAt: ISODateTimeString,
): ClaimReminder {
  if (remindAt <= reminder.remindAt) {
    throw new Error(`Snooze must move reminder ${reminder.id} to a later time.`);
  }
  return { ...reminder, remindAt, disabledAt: undefined };
}

// "Nicht mehr erinnern": disabling is always allowed and keeps the record.
export function disableReminder(
  reminder: ClaimReminder,
  disabledAt: ISODateTimeString,
): ClaimReminder {
  return { ...reminder, disabledAt };
}

// Allowed status transitions (docs/product/claim-dispute-clarification-v0.1.md).
// Key dispute rules: only claims visible to the counterparty can be disputed;
// a dispute never deletes or invalidates the claim — it stays open at the
// creator as "needs clarification" until clarified, taken over or archived;
// a disputed claim can never jump straight to settled.
// Exported so scripts/check-claim-transition-parity.ts can prove the database
// trigger enforces exactly this table (single source of truth lives here).
export const CLAIM_STATUS_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  draft: ["private_open", "linked_open", "archived"],
  // Private claims have no counterparty view, so they cannot be disputed.
  private_open: ["linked_open", "partially_paid", "marked_paid", "settled", "archived"],
  linked_open: ["debtor_acknowledged", "disputed", "partially_paid", "marked_paid", "archived"],
  debtor_acknowledged: ["disputed", "partially_paid", "marked_paid", "archived"],
  // Clarification reopens the claim (back to linked_open) or the debtor takes
  // it over after talking it through; only the creator may archive it.
  disputed: ["linked_open", "debtor_acknowledged", "archived"],
  partially_paid: ["disputed", "marked_paid", "creditor_confirmed", "settled", "archived"],
  marked_paid: ["disputed", "creditor_confirmed", "archived"],
  creditor_confirmed: ["settled", "archived"],
  settled: ["archived"],
  archived: [],
};

export function canTransitionClaimStatus(from: ClaimStatus, to: ClaimStatus): boolean {
  return CLAIM_STATUS_TRANSITIONS[from].includes(to);
}

// Applies a validated status change. Throws on transitions the workflow
// forbids, so stores/UI cannot silently skip the clarification path.
export function transitionClaimStatus(
  claim: Claim,
  to: ClaimStatus,
  at: ISODateTimeString,
): Claim {
  if (!canTransitionClaimStatus(claim.status, to)) {
    throw new Error(`Claim ${claim.id} cannot move from ${claim.status} to ${to}.`);
  }
  return {
    ...claim,
    status: to,
    updatedAt: at,
    archivedAt: to === "archived" ? at : claim.archivedAt,
  };
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

function resolveCounterparty(
  claim: Claim,
  counterparties: Counterparty[],
): Counterparty | undefined {
  return counterparties.find((counterparty) => counterparty.id === claim.counterpartyId);
}

// A claim runs in "linked" mode (counterparty can see it, payments need
// creditor confirmation) only when the counterparty is a linked app user AND
// the creator shared the claim.
export function isLinkedClaim(claim: Claim, counterparties: Counterparty[]): boolean {
  const counterparty = resolveCounterparty(claim, counterparties);
  return (
    counterparty !== undefined &&
    isCounterpartyLinked(counterparty) &&
    claim.sharedWithCounterparty
  );
}

// Binding paid amount: for linked claims only creditor-confirmed payments
// count; for private claims (unlinked or unshared) recorded payments count
// too. Pending and rejected payments never reduce the remainder.
export function getClaimPaidAmount(
  claim: Claim,
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): number {
  assertIntegerAmount(claim.amount, "claim amount");
  const linked = isLinkedClaim(claim, counterparties);

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

export function getClaimRemainingAmount(
  claim: Claim,
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): number {
  return Math.max(claim.amount - getClaimPaidAmount(claim, payments, counterparties), 0);
}

export function deriveClaimLifecycle(
  claim: Claim,
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): ClaimLifecycle {
  if (claim.status === "archived" || claim.archivedAt) {
    return "archived";
  }
  if (claim.status === "disputed") {
    return "disputed";
  }

  const remaining = getClaimRemainingAmount(claim, payments, counterparties);
  if (remaining === 0) {
    if (
      !isLinkedClaim(claim, counterparties) ||
      claim.status === "creditor_confirmed" ||
      claim.status === "settled"
    ) {
      return "settled";
    }
    // Linked claim fully paid but not yet creditor-confirmed: still in progress.
    return "partially_paid";
  }

  return remaining < claim.amount ? "partially_paid" : "open";
}

export function isClaimClosed(
  claim: Claim,
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): boolean {
  const lifecycle = deriveClaimLifecycle(claim, payments, counterparties);
  return lifecycle === "settled" || lifecycle === "archived";
}

export interface FilterClaimsInput {
  claims: Claim[];
  payments: ClaimPayment[];
  counterparties?: Counterparty[];
  includeClosed?: boolean;
}

export function filterVisibleClaims(input: FilterClaimsInput): Claim[] {
  if (input.includeClosed) {
    return [...input.claims];
  }
  return input.claims.filter(
    (claim) => !isClaimClosed(claim, input.payments, input.counterparties ?? []),
  );
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

// One row per counterparty and currency, open claims only. The stable
// counterparty id keys each person, so reused external persons aggregate
// instead of fragmenting into per-claim free-text duplicates.
export function summarizeClaimsByPerson(
  claims: Claim[],
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): PersonClaimSummary[] {
  const summaries = new Map<string, PersonClaimSummary>();

  for (const claim of claims) {
    if (isClaimClosed(claim, payments, counterparties)) {
      continue;
    }
    const remaining = getClaimRemainingAmount(claim, payments, counterparties);
    if (remaining === 0) {
      continue;
    }

    const counterparty = resolveCounterparty(claim, counterparties);
    const personKey = claim.counterpartyId;
    const key = `${claim.currency}:${personKey}`;
    const existing = summaries.get(key) ?? {
      counterpartyKey: personKey,
      counterpartyName: counterparty?.displayName ?? claim.counterpartyId,
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
