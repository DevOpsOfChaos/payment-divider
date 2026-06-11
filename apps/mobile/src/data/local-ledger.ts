import type { Expense, ExpenseShare } from "@payment-divider/core";

// Session-only in-memory draft ledger. Drafts entered in the Record screen
// live here and are merged into the demo balance/timeline derivations.
// No persistence, no backend: reloading the app discards everything.

export interface DraftExpenseInput {
  expense: Expense;
  shares: ExpenseShare[];
}

let draftExpenses: readonly Expense[] = [];
let draftExpenseShares: readonly ExpenseShare[] = [];
let ledgerVersion = 0;

const listeners = new Set<() => void>();

function emitChange(): void {
  ledgerVersion += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function addDraftExpense(input: DraftExpenseInput): void {
  draftExpenses = [...draftExpenses, input.expense];
  draftExpenseShares = [...draftExpenseShares, ...input.shares];
  emitChange();
}

export function clearDraftExpenses(): void {
  if (draftExpenses.length === 0) {
    return;
  }
  draftExpenses = [];
  draftExpenseShares = [];
  emitChange();
}

export function getDraftExpenses(): readonly Expense[] {
  return draftExpenses;
}

export function getDraftExpenseShares(): readonly ExpenseShare[] {
  return draftExpenseShares;
}

export function getLedgerVersion(): number {
  return ledgerVersion;
}

export function subscribeToLocalLedger(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
