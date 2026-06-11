import type {
  EntityId,
  Expense,
  ExpenseShare,
  PaymentAction,
  PaymentActionStatus,
} from "@payment-divider/core";

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

// Lets non-draft data sources (e.g. the supabase-local adapter finishing a
// fetch) trigger the same screen re-render path as draft changes.
export function notifyExternalDataChanged(): void {
  emitChange();
}

export function subscribeToLocalLedger(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Session-local ledger status overrides for demo payment actions. Only the
// two ledger transitions exist: payer marks suggested as marked_paid; payee
// confirms or rejects a marked_paid action. Nothing here executes a payment.

let paymentActionStatusOverrides: ReadonlyMap<EntityId, PaymentActionStatus> = new Map();

export function getEffectivePaymentActionStatus(action: PaymentAction): PaymentActionStatus {
  return paymentActionStatusOverrides.get(action.id) ?? action.status;
}

export function applyLocalPaymentActionOverrides(
  actions: readonly PaymentAction[],
): PaymentAction[] {
  return actions.map((action) => {
    const status = getEffectivePaymentActionStatus(action);
    return status === action.status ? action : { ...action, status };
  });
}

function setPaymentActionStatus(actionId: EntityId, status: PaymentActionStatus): void {
  const next = new Map(paymentActionStatusOverrides);
  next.set(actionId, status);
  paymentActionStatusOverrides = next;
  emitChange();
}

function transitionPaymentAction(
  action: PaymentAction,
  from: PaymentActionStatus,
  to: PaymentActionStatus,
): boolean {
  if (getEffectivePaymentActionStatus(action) !== from) {
    return false;
  }
  setPaymentActionStatus(action.id, to);
  return true;
}

export function markPaymentActionPaid(action: PaymentAction): boolean {
  return transitionPaymentAction(action, "suggested", "marked_paid");
}

export function confirmPaymentAction(action: PaymentAction): boolean {
  return transitionPaymentAction(action, "marked_paid", "confirmed");
}

export function rejectPaymentAction(action: PaymentAction): boolean {
  return transitionPaymentAction(action, "marked_paid", "rejected");
}
