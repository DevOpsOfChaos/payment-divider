import {
  calculateActivityBalances,
  calculateGroupBalances,
  calculatePersonalBalanceSummary,
  type BalanceEntry,
  type CurrencyCode,
  type EntityId,
} from "@payment-divider/core";

import type { BalanceTone } from "./groups";
import {
  MOCK_CURRENT_USER_ID,
  MOCK_EXPENSES,
  MOCK_EXPENSE_SHARES,
  MOCK_PAYMENT_ACTIONS,
} from "./ledger";
import {
  applyLocalPaymentActionOverrides,
  getDraftExpenses,
  getDraftExpenseShares,
} from "../data/local-ledger";

const DEFAULT_CURRENCY: CurrencyCode = "EUR";

// Built per call so session-local Record drafts flow into every derived balance.
export function getBalanceInput() {
  return {
    expenses: [...MOCK_EXPENSES, ...getDraftExpenses()],
    expenseShares: [...MOCK_EXPENSE_SHARES, ...getDraftExpenseShares()],
    paymentActions: applyLocalPaymentActionOverrides(MOCK_PAYMENT_ACTIONS),
  };
}

function getCurrentUserAmount(balanceEntries: BalanceEntry[]): number {
  return (
    balanceEntries.find(
      (balanceEntry) =>
        balanceEntry.userId === MOCK_CURRENT_USER_ID &&
        balanceEntry.currency === DEFAULT_CURRENCY,
    )?.amount ?? 0
  );
}

export function formatMoney(amountInMinorUnits: number): string {
  const amount = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInMinorUnits / 100);

  return `${amount} €`;
}

export function getBalanceTone(amountInMinorUnits: number): BalanceTone {
  if (amountInMinorUnits > 0) {
    return "positive";
  }

  if (amountInMinorUnits < 0) {
    return "negative";
  }

  return "settled";
}

export function formatBalanceLabel(amountInMinorUnits: number): string {
  if (amountInMinorUnits > 0) {
    return `Du bekommst ${formatMoney(amountInMinorUnits)}`;
  }

  if (amountInMinorUnits < 0) {
    return `Du schuldest ${formatMoney(Math.abs(amountInMinorUnits))}`;
  }

  return "Alles ausgeglichen";
}

export function getPersonalBalanceSummary() {
  const summary = calculatePersonalBalanceSummary({
    ...getBalanceInput(),
    userId: MOCK_CURRENT_USER_ID,
  });
  const balance = summary.balances.find(
    (balanceEntry) => balanceEntry.currency === DEFAULT_CURRENCY,
  );
  const amount = balance?.netAmount ?? 0;

  return {
    amount,
    label: formatBalanceLabel(amount),
    tone: getBalanceTone(amount),
    breakdown: `Forderungen ${formatMoney(balance?.totalReceivable ?? 0)} · Schulden ${formatMoney(
      balance?.totalOwed ?? 0,
    )}`,
  };
}

export function getGroupBalanceSummary(groupId: EntityId) {
  const amount = getCurrentUserAmount(
    calculateGroupBalances({
      ...getBalanceInput(),
      groupId,
    }),
  );

  return {
    amount,
    label: formatBalanceLabel(amount),
    tone: getBalanceTone(amount),
  };
}

export function getActivityBalanceSummary(groupId: EntityId, contextId: EntityId) {
  const amount = getCurrentUserAmount(
    calculateActivityBalances({
      ...getBalanceInput(),
      groupId,
      contextId,
    }),
  );

  return {
    amount,
    label: formatBalanceLabel(amount),
    tone: getBalanceTone(amount),
  };
}
