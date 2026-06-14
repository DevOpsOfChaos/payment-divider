import type {
  CurrencyCode,
  EntityId,
  Expense,
  ExpenseShare,
  PaymentAction,
} from "./domain-types";

// Person balance overview (issue #89): per counterparty, what is open between
// the current user and that person across sources. Gross positions stay
// visible — netting is a summary on top, never a replacement. Closed
// positions are kept as history but separated from the open set. This module
// aggregates ledger data only; it never initiates payments.

import {
  getClaimRemainingAmount,
  isClaimClosed,
  type Claim,
  type ClaimDirection,
  type ClaimPayment,
  type ClaimStatus,
} from "./claims";
import type { Counterparty } from "./counterparties";

// "recurring_cost" is reserved for shared subscriptions
// (docs/product/shared-subscriptions-v0.1.md); no producer exists yet.
export type PersonBalanceSourceType = "private_claim" | "group_balance" | "recurring_cost";

// One gross position between the current user and a counterparty. Positions
// are never merged across sources; the overview sums them per person.
export interface PersonBalancePosition {
  sourceType: PersonBalanceSourceType;
  sourceId: EntityId;
  counterpartyId: EntityId;
  direction: ClaimDirection;
  // Open positions carry the remaining amount; closed positions keep the
  // original amount for the history view.
  amount: number;
  currency: CurrencyCode;
  label?: string;
  closed: boolean;
  // Only set when closed === true; the terminal claim status (settled or archived).
  closedStatus?: ClaimStatus;
}

export interface PersonBalanceOverview {
  counterpartyId: EntityId;
  counterpartyName: string;
  currency: CurrencyCode;
  openOwedToMe: number;
  openOwedByMe: number;
  netAmount: number;
  openPositions: PersonBalancePosition[];
  closedPositions: PersonBalancePosition[];
}

function assertIntegerAmount(amount: number, fieldName: string): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be an integer in the smallest currency unit.`);
  }
}

// Converts claims into gross positions. Open claims contribute their
// remaining amount; settled/archived claims become closed history positions.
// Linked-claim payment rules apply via getClaimRemainingAmount: on shared
// linked claims only creditor-confirmed payments reduce the remainder, so the
// overview never shows a counterparty-recorded but unconfirmed payment as
// settled.
export function claimsToPersonPositions(
  claims: Claim[],
  payments: ClaimPayment[],
  counterparties: Counterparty[] = [],
): PersonBalancePosition[] {
  return claims.map((claim) => {
    const closed = isClaimClosed(claim, payments, counterparties);
    return {
      sourceType: "private_claim" as const,
      sourceId: claim.id,
      counterpartyId: claim.counterpartyId,
      direction: claim.direction,
      amount: closed
        ? claim.amount
        : getClaimRemainingAmount(claim, payments, counterparties),
      currency: claim.currency,
      label: claim.purpose,
      closed,
      closedStatus: closed
        ? claim.status === "archived" || claim.archivedAt != null
          ? "archived"
          : "settled"
        : undefined,
    };
  });
}

export interface PairwiseGroupPositionsInput {
  expenses: Expense[];
  expenseShares: ExpenseShare[];
  paymentActions?: PaymentAction[];
  currentUserId: EntityId;
  // Owner's counterparty records; only counterparties linked to an app user
  // can carry group positions (group members are always app users).
  counterparties: Counterparty[];
}

const SETTLED_PAYMENT_ACTION_STATUSES: ReadonlySet<PaymentAction["status"]> = new Set([
  "marked_paid",
  "confirmed",
]);

// Derives pairwise gross group positions between the current user and each
// other member: one position per group, person and currency. Positive
// pairwise amounts mean the other person owes the current user. Persons
// without a linked counterparty record are skipped — group balances only
// attach to people the user already tracks.
export function groupBalancesToPersonPositions(
  input: PairwiseGroupPositionsInput,
): PersonBalancePosition[] {
  const counterpartyByUserId = new Map<EntityId, Counterparty>();
  for (const counterparty of input.counterparties) {
    if (counterparty.linkedUserId !== undefined && !counterparty.archivedAt) {
      counterpartyByUserId.set(counterparty.linkedUserId, counterparty);
    }
  }

  const sharesByExpenseId = new Map<EntityId, ExpenseShare[]>();
  for (const share of input.expenseShares) {
    const existing = sharesByExpenseId.get(share.expenseId);
    if (existing) {
      existing.push(share);
    } else {
      sharesByExpenseId.set(share.expenseId, [share]);
    }
  }

  // key: `${groupId}:${currency}:${otherUserId}` → amount owed to current user.
  const pairwise = new Map<string, number>();
  const add = (groupId: EntityId, currency: CurrencyCode, otherUserId: EntityId, amount: number) => {
    assertIntegerAmount(amount, "pairwise amount");
    const key = `${groupId}:${currency}:${otherUserId}`;
    pairwise.set(key, (pairwise.get(key) ?? 0) + amount);
  };

  for (const expense of input.expenses) {
    if (expense.deletedAt) {
      continue;
    }
    const shares = sharesByExpenseId.get(expense.id) ?? [];
    if (expense.paidByUserId === input.currentUserId) {
      for (const share of shares) {
        if (share.userId !== input.currentUserId) {
          add(expense.groupId, share.currency, share.userId, share.amount);
        }
      }
    } else {
      const ownShare = shares.find((share) => share.userId === input.currentUserId);
      if (ownShare) {
        add(expense.groupId, ownShare.currency, expense.paidByUserId, -ownShare.amount);
      }
    }
  }

  for (const paymentAction of input.paymentActions ?? []) {
    if (!SETTLED_PAYMENT_ACTION_STATUSES.has(paymentAction.status)) {
      continue;
    }
    if (paymentAction.payerId === input.currentUserId) {
      add(paymentAction.groupId, paymentAction.currency, paymentAction.payeeId, paymentAction.amount);
    } else if (paymentAction.payeeId === input.currentUserId) {
      add(paymentAction.groupId, paymentAction.currency, paymentAction.payerId, -paymentAction.amount);
    }
  }

  const positions: PersonBalancePosition[] = [];
  for (const [key, amount] of pairwise) {
    const [groupId, currency, otherUserId] = key.split(":");
    const counterparty = counterpartyByUserId.get(otherUserId);
    if (!counterparty) {
      continue;
    }
    positions.push({
      sourceType: "group_balance",
      sourceId: groupId,
      counterpartyId: counterparty.id,
      direction: amount >= 0 ? "owed_to_me" : "owed_by_me",
      amount: Math.abs(amount),
      currency: currency as CurrencyCode,
      closed: amount === 0,
    });
  }
  return positions;
}

export interface BuildPersonBalanceOverviewInput {
  positions: PersonBalancePosition[];
  counterparties: Counterparty[];
}

// Aggregates gross positions into one overview row per counterparty and
// currency. The net amount summarizes open positions only; closed positions
// stay attached as history and never influence the net.
export function buildPersonBalanceOverview(
  input: BuildPersonBalanceOverviewInput,
): PersonBalanceOverview[] {
  const overviews = new Map<string, PersonBalanceOverview>();

  for (const position of input.positions) {
    assertIntegerAmount(position.amount, "position amount");
    const counterparty = input.counterparties.find(
      (candidate) => candidate.id === position.counterpartyId,
    );
    const key = `${position.currency}:${position.counterpartyId}`;
    const existing = overviews.get(key) ?? {
      counterpartyId: position.counterpartyId,
      counterpartyName: counterparty?.displayName ?? position.counterpartyId,
      currency: position.currency,
      openOwedToMe: 0,
      openOwedByMe: 0,
      netAmount: 0,
      openPositions: [],
      closedPositions: [],
    };

    if (position.closed) {
      existing.closedPositions.push(position);
    } else {
      existing.openPositions.push(position);
      if (position.direction === "owed_to_me") {
        existing.openOwedToMe += position.amount;
      } else {
        existing.openOwedByMe += position.amount;
      }
      existing.netAmount = existing.openOwedToMe - existing.openOwedByMe;
    }
    overviews.set(key, existing);
  }

  return [...overviews.values()].sort(
    (left, right) =>
      left.currency.localeCompare(right.currency) ||
      left.counterpartyName.localeCompare(right.counterpartyName),
  );
}
