import type {
  CurrencyCode,
  EntityId,
  Expense,
  ExpenseShare,
  PaymentAction,
} from "./domain-types";

export interface EqualSplitShare {
  userId: EntityId;
  amount: number;
  currency: CurrencyCode;
}

export interface SplitExpenseEquallyInput {
  amount: number;
  currency: CurrencyCode;
  participantUserIds: EntityId[];
}

export interface BalanceEntry {
  userId: EntityId;
  currency: CurrencyCode;
  amount: number;
}

export interface BalanceCalculationInput {
  expenses: Expense[];
  expenseShares: ExpenseShare[];
  paymentActions?: PaymentAction[];
}

export interface ScopedBalanceCalculationInput extends BalanceCalculationInput {
  groupId: EntityId;
}

export interface ActivityBalanceCalculationInput extends ScopedBalanceCalculationInput {
  contextId: EntityId;
}

export interface PersonalBalanceSummaryByCurrency {
  currency: CurrencyCode;
  netAmount: number;
  totalOwed: number;
  totalReceivable: number;
}

export interface PersonalBalanceSummary {
  userId: EntityId;
  balances: PersonalBalanceSummaryByCurrency[];
}

const SETTLED_PAYMENT_ACTION_STATUSES: ReadonlySet<PaymentAction["status"]> = new Set([
  "marked_paid",
  "confirmed",
]);

function assertIntegerAmount(amount: number, fieldName: string): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${fieldName} must be an integer in the smallest currency unit.`);
  }
}

function assertDistinctUserIds(userIds: EntityId[]): void {
  if (new Set(userIds).size !== userIds.length) {
    throw new Error("participantUserIds must not contain duplicates.");
  }
}

function sortEntityIds(userIds: EntityId[]): EntityId[] {
  return [...userIds].sort((left, right) => left.localeCompare(right));
}

function addAmount(
  balanceMap: Map<string, BalanceEntry>,
  userId: EntityId,
  currency: CurrencyCode,
  amount: number,
): void {
  assertIntegerAmount(amount, "amount");

  const key = `${currency}:${userId}`;
  const existing = balanceMap.get(key);

  if (existing) {
    existing.amount += amount;
    return;
  }

  balanceMap.set(key, {
    userId,
    currency,
    amount,
  });
}

function buildExpenseSharesByExpenseId(expenseShares: ExpenseShare[]): Map<EntityId, ExpenseShare[]> {
  const sharesByExpenseId = new Map<EntityId, ExpenseShare[]>();

  for (const expenseShare of expenseShares) {
    assertIntegerAmount(expenseShare.amount, "expense share amount");

    const existingShares = sharesByExpenseId.get(expenseShare.expenseId);
    if (existingShares) {
      existingShares.push(expenseShare);
      continue;
    }

    sharesByExpenseId.set(expenseShare.expenseId, [expenseShare]);
  }

  return sharesByExpenseId;
}

function validateExpenseShares(expense: Expense, expenseShares: ExpenseShare[]): void {
  if (expenseShares.length === 0) {
    throw new Error(`Expense ${expense.id} must have at least one share.`);
  }

  const seenUserIds = new Set<EntityId>();
  let totalShareAmount = 0;

  for (const expenseShare of expenseShares) {
    if (expenseShare.currency !== expense.currency) {
      throw new Error(`Expense share currency must match expense currency for expense ${expense.id}.`);
    }

    if (seenUserIds.has(expenseShare.userId)) {
      throw new Error(`Expense ${expense.id} must not contain duplicate shares for the same user.`);
    }

    seenUserIds.add(expenseShare.userId);
    totalShareAmount += expenseShare.amount;
  }

  if (totalShareAmount !== expense.amount) {
    throw new Error(`Expense shares must sum to the expense amount for expense ${expense.id}.`);
  }
}

function isSettledPaymentAction(paymentAction: PaymentAction): boolean {
  return SETTLED_PAYMENT_ACTION_STATUSES.has(paymentAction.status);
}

function sortBalanceEntries(balanceEntries: Iterable<BalanceEntry>): BalanceEntry[] {
  return [...balanceEntries]
    .sort(
      (left, right) =>
        left.currency.localeCompare(right.currency) || left.userId.localeCompare(right.userId),
    );
}

function calculateBalancesFromFilteredRecords(input: BalanceCalculationInput): BalanceEntry[] {
  const balanceMap = new Map<string, BalanceEntry>();
  const sharesByExpenseId = buildExpenseSharesByExpenseId(input.expenseShares);

  for (const expense of input.expenses) {
    if (expense.deletedAt) {
      continue;
    }

    assertIntegerAmount(expense.amount, "expense amount");

    const expenseShares = sharesByExpenseId.get(expense.id) ?? [];
    validateExpenseShares(expense, expenseShares);

    addAmount(balanceMap, expense.paidByUserId, expense.currency, expense.amount);

    for (const expenseShare of expenseShares) {
      addAmount(balanceMap, expenseShare.userId, expenseShare.currency, -expenseShare.amount);
    }
  }

  for (const paymentAction of input.paymentActions ?? []) {
    if (!isSettledPaymentAction(paymentAction)) {
      continue;
    }

    assertIntegerAmount(paymentAction.amount, "payment action amount");

    addAmount(balanceMap, paymentAction.payerId, paymentAction.currency, paymentAction.amount);
    addAmount(balanceMap, paymentAction.payeeId, paymentAction.currency, -paymentAction.amount);
  }

  return sortBalanceEntries(balanceMap.values());
}

export function splitExpenseEqually(input: SplitExpenseEquallyInput): EqualSplitShare[] {
  assertIntegerAmount(input.amount, "expense amount");

  if (input.participantUserIds.length === 0) {
    throw new Error("participantUserIds must contain at least one user.");
  }

  assertDistinctUserIds(input.participantUserIds);

  const sortedParticipantUserIds = sortEntityIds(input.participantUserIds);
  const baseShareAmount = Math.floor(input.amount / sortedParticipantUserIds.length);
  const remainder = input.amount % sortedParticipantUserIds.length;

  return sortedParticipantUserIds.map((userId, index) => ({
    userId,
    // Remainder cents go to the lowest sorted user ids to keep distribution deterministic.
    amount: baseShareAmount + (index < remainder ? 1 : 0),
    currency: input.currency,
  }));
}

export function calculateBalances(input: BalanceCalculationInput): BalanceEntry[] {
  return calculateBalancesFromFilteredRecords(input);
}

export function calculateGroupBalances(input: ScopedBalanceCalculationInput): BalanceEntry[] {
  const filteredExpenses = input.expenses.filter((expense) => expense.groupId === input.groupId);
  const filteredExpenseIds = new Set(filteredExpenses.map((expense) => expense.id));

  return calculateBalancesFromFilteredRecords({
    expenses: filteredExpenses,
    expenseShares: input.expenseShares.filter((expenseShare) =>
      filteredExpenseIds.has(expenseShare.expenseId),
    ),
    paymentActions: (input.paymentActions ?? []).filter(
      (paymentAction) => paymentAction.groupId === input.groupId,
    ),
  });
}

export function calculateActivityBalances(
  input: ActivityBalanceCalculationInput,
): BalanceEntry[] {
  const filteredExpenses = input.expenses.filter(
    (expense) => expense.groupId === input.groupId && expense.contextId === input.contextId,
  );
  const filteredExpenseIds = new Set(filteredExpenses.map((expense) => expense.id));

  return calculateBalancesFromFilteredRecords({
    expenses: filteredExpenses,
    expenseShares: input.expenseShares.filter((expenseShare) =>
      filteredExpenseIds.has(expenseShare.expenseId),
    ),
    paymentActions: (input.paymentActions ?? []).filter(
      (paymentAction) =>
        paymentAction.groupId === input.groupId && paymentAction.contextId === input.contextId,
    ),
  });
}

export function calculatePersonalBalanceSummary(
  input: BalanceCalculationInput & { userId: EntityId },
): PersonalBalanceSummary {
  const balances = calculateBalancesFromFilteredRecords(input)
    .filter((balanceEntry) => balanceEntry.userId === input.userId)
    .map((balanceEntry) => ({
      currency: balanceEntry.currency,
      netAmount: balanceEntry.amount,
      totalOwed: balanceEntry.amount < 0 ? Math.abs(balanceEntry.amount) : 0,
      totalReceivable: balanceEntry.amount > 0 ? balanceEntry.amount : 0,
    }));

  return {
    userId: input.userId,
    balances,
  };
}
