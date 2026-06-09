import type {
  CurrencyCode,
  EntityId,
  Expense,
  ExpenseShare,
  Group,
  GroupContext,
  PaymentAction,
  User,
} from "@payment-divider/core";
import { splitExpenseEqually } from "@payment-divider/core";

const CURRENCY: CurrencyCode = "EUR";
const CREATED_AT = "2026-06-09T12:00:00.000Z";

export const MOCK_CURRENT_USER_ID: EntityId = "user-manu";

export const MOCK_USER_IDS = {
  manu: MOCK_CURRENT_USER_ID,
  anna: "user-anna",
  lukas: "user-lukas",
  max: "user-max",
  leo: "user-leo",
} as const;

export const MOCK_GROUP_IDS = {
  friends: "group-friends",
  flat: "group-flat",
  portugal: "group-portugal",
} as const;

export const MOCK_CONTEXT_IDS = {
  friendsGeneral: "context-friends-general",
  amsterdam: "context-amsterdam-2026",
  festival: "context-festival-2026",
  flatGeneral: "context-flat-general",
  portugalDinner: "context-portugal-dinner",
} as const;

export const MOCK_USERS: User[] = [
  {
    id: MOCK_USER_IDS.manu,
    displayName: "Manu",
    username: "manu",
    email: "mock-manu@example.invalid",
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_USER_IDS.anna,
    displayName: "Anna",
    username: "anna",
    email: "mock-anna@example.invalid",
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_USER_IDS.lukas,
    displayName: "Lukas",
    username: "lukas",
    email: "mock-lukas@example.invalid",
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_USER_IDS.max,
    displayName: "Max",
    username: "max",
    email: "mock-max@example.invalid",
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_USER_IDS.leo,
    displayName: "Leo",
    username: "leo",
    email: "mock-leo@example.invalid",
    createdAt: CREATED_AT,
  },
];

export const MOCK_GROUPS: Group[] = [
  {
    id: MOCK_GROUP_IDS.friends,
    name: "Freundeskreis",
    type: "friends",
    defaultCurrency: CURRENCY,
    createdBy: MOCK_USER_IDS.manu,
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_GROUP_IDS.flat,
    name: "WG Berlin",
    type: "shared_flat",
    defaultCurrency: CURRENCY,
    createdBy: MOCK_USER_IDS.manu,
    createdAt: CREATED_AT,
  },
  {
    id: MOCK_GROUP_IDS.portugal,
    name: "Portugal Reise Crew",
    type: "trip",
    defaultCurrency: CURRENCY,
    createdBy: MOCK_USER_IDS.anna,
    createdAt: CREATED_AT,
  },
];

export const MOCK_CONTEXTS: GroupContext[] = [
  {
    id: MOCK_CONTEXT_IDS.friendsGeneral,
    groupId: MOCK_GROUP_IDS.friends,
    name: "Allgemein",
    type: "general",
    defaultCurrency: CURRENCY,
  },
  {
    id: MOCK_CONTEXT_IDS.amsterdam,
    groupId: MOCK_GROUP_IDS.friends,
    name: "Amsterdam 2026",
    type: "trip",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    defaultCurrency: CURRENCY,
  },
  {
    id: MOCK_CONTEXT_IDS.festival,
    groupId: MOCK_GROUP_IDS.friends,
    name: "Festival 2026",
    type: "event",
    defaultCurrency: CURRENCY,
  },
  {
    id: MOCK_CONTEXT_IDS.flatGeneral,
    groupId: MOCK_GROUP_IDS.flat,
    name: "Allgemein",
    type: "household",
    defaultCurrency: CURRENCY,
  },
  {
    id: MOCK_CONTEXT_IDS.portugalDinner,
    groupId: MOCK_GROUP_IDS.portugal,
    name: "Abendessen",
    type: "trip",
    defaultCurrency: CURRENCY,
  },
];

function createExpense(input: {
  id: EntityId;
  groupId: EntityId;
  contextId: EntityId;
  amount: number;
  paidByUserId: EntityId;
  date: string;
  title: string;
}): Expense {
  return {
    ...input,
    currency: CURRENCY,
    createdBy: input.paidByUserId,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function createEqualShares(expense: Expense, participantUserIds: EntityId[]): ExpenseShare[] {
  return splitExpenseEqually({
    amount: expense.amount,
    currency: expense.currency,
    participantUserIds,
  }).map((share) => ({
    id: `share-${expense.id}-${share.userId}`,
    expenseId: expense.id,
    userId: share.userId,
    shareType: "equal",
    amount: share.amount,
    currency: share.currency,
  }));
}

function createFixedShares(
  expense: Expense,
  shares: Array<{ userId: EntityId; amount: number }>,
): ExpenseShare[] {
  return shares.map((share) => ({
    id: `share-${expense.id}-${share.userId}`,
    expenseId: expense.id,
    userId: share.userId,
    shareType: "fixed",
    amount: share.amount,
    currency: expense.currency,
  }));
}

const amsterdamDinner = createExpense({
  id: "expense-amsterdam-dinner",
  groupId: MOCK_GROUP_IDS.friends,
  contextId: MOCK_CONTEXT_IDS.amsterdam,
  amount: 4280,
  paidByUserId: MOCK_USER_IDS.anna,
  date: "2026-08-01",
  title: "Abendessen",
});

const amsterdamTickets = createExpense({
  id: "expense-amsterdam-tickets",
  groupId: MOCK_GROUP_IDS.friends,
  contextId: MOCK_CONTEXT_IDS.amsterdam,
  amount: 6426,
  paidByUserId: MOCK_USER_IDS.manu,
  date: "2026-08-02",
  title: "Tickets",
});

const friendsGeneralSnacks = createExpense({
  id: "expense-friends-general-snacks",
  groupId: MOCK_GROUP_IDS.friends,
  contextId: MOCK_CONTEXT_IDS.friendsGeneral,
  amount: 1600,
  paidByUserId: MOCK_USER_IDS.lukas,
  date: "2026-06-07",
  title: "Snacks",
});

const festivalSupplies = createExpense({
  id: "expense-festival-supplies",
  groupId: MOCK_GROUP_IDS.friends,
  contextId: MOCK_CONTEXT_IDS.festival,
  amount: 3000,
  paidByUserId: MOCK_USER_IDS.manu,
  date: "2026-07-12",
  title: "Festivalbedarf",
});

const flatSupplies = createExpense({
  id: "expense-flat-supplies",
  groupId: MOCK_GROUP_IDS.flat,
  contextId: MOCK_CONTEXT_IDS.flatGeneral,
  amount: 5520,
  paidByUserId: MOCK_USER_IDS.max,
  date: "2026-06-05",
  title: "Haushaltskosten",
});

const portugalDinner = createExpense({
  id: "expense-portugal-dinner",
  groupId: MOCK_GROUP_IDS.portugal,
  contextId: MOCK_CONTEXT_IDS.portugalDinner,
  amount: 9135,
  paidByUserId: MOCK_USER_IDS.manu,
  date: "2026-06-09",
  title: "Abendessen",
});

export const MOCK_EXPENSES: Expense[] = [
  amsterdamDinner,
  amsterdamTickets,
  friendsGeneralSnacks,
  festivalSupplies,
  flatSupplies,
  portugalDinner,
];

export const MOCK_EXPENSE_SHARES: ExpenseShare[] = [
  ...createEqualShares(amsterdamDinner, [
    MOCK_USER_IDS.manu,
    MOCK_USER_IDS.anna,
    MOCK_USER_IDS.lukas,
  ]),
  ...createFixedShares(amsterdamTickets, [
    { userId: MOCK_USER_IDS.anna, amount: 3213 },
    { userId: MOCK_USER_IDS.lukas, amount: 3213 },
  ]),
  ...createEqualShares(friendsGeneralSnacks, [
    MOCK_USER_IDS.manu,
    MOCK_USER_IDS.lukas,
  ]),
  ...createEqualShares(festivalSupplies, [
    MOCK_USER_IDS.manu,
    MOCK_USER_IDS.anna,
    MOCK_USER_IDS.lukas,
  ]),
  ...createEqualShares(flatSupplies, [
    MOCK_USER_IDS.manu,
    MOCK_USER_IDS.max,
    MOCK_USER_IDS.anna,
  ]),
  ...createEqualShares(portugalDinner, [
    MOCK_USER_IDS.manu,
    MOCK_USER_IDS.anna,
    MOCK_USER_IDS.leo,
  ]),
];

export const MOCK_PAYMENT_ACTIONS: PaymentAction[] = [
  {
    id: "payment-festival-settlement",
    groupId: MOCK_GROUP_IDS.friends,
    contextId: MOCK_CONTEXT_IDS.festival,
    payerId: MOCK_USER_IDS.anna,
    payeeId: MOCK_USER_IDS.manu,
    amount: 2000,
    currency: CURRENCY,
    status: "marked_paid",
    createdAt: CREATED_AT,
    markedPaidAt: CREATED_AT,
  },
];
