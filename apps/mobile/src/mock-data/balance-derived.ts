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

const DEFAULT_CURRENCY: CurrencyCode = "EUR";

const BALANCE_INPUT = {
  expenses: MOCK_EXPENSES,
  expenseShares: MOCK_EXPENSE_SHARES,
  paymentActions: MOCK_PAYMENT_ACTIONS,
};

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
    ...BALANCE_INPUT,
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
      ...BALANCE_INPUT,
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
      ...BALANCE_INPUT,
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
