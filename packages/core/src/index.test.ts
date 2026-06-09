import assert from "node:assert/strict";
import test from "node:test";

import * as core from "./index";

import type {
  ContextMember,
  EntityId,
  Expense,
  ExpenseShare,
  MemberAvailability,
  PaymentAction,
} from "./domain-types";

const groupId = "group-1";
const tripContextId = "context-trip";
const otherContextId = "context-other";
const createdBy = "user-admin";
const createdAt = "2026-06-09T10:00:00.000Z";

function buildContextMember(userId: EntityId, contextId = tripContextId): ContextMember {
  return {
    id: `context-member-${contextId}-${userId}`,
    contextId,
    userId,
    defaultIncluded: true,
    joinedAt: createdAt,
  };
}

function buildAvailability(
  overrides: Partial<MemberAvailability> &
    Pick<MemberAvailability, "id" | "userId" | "unavailableFrom" | "mode">,
): MemberAvailability {
  return {
    groupId,
    affectsDefaultSelection: true,
    createdBy,
    createdAt,
    ...overrides,
  };
}

function buildExpense(
  overrides: Partial<Expense> &
    Pick<
      Expense,
      "id" | "groupId" | "contextId" | "amount" | "currency" | "paidByUserId" | "date"
    >,
): Expense {
  return {
    title: undefined,
    note: undefined,
    createdBy,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function buildExpenseShares(
  expenseId: EntityId,
  shares: Array<{ userId: EntityId; amount: number; currency?: string }>,
): ExpenseShare[] {
  return shares.map((share) => ({
    id: `share-${expenseId}-${share.userId}`,
    expenseId,
    userId: share.userId,
    shareType: "equal",
    amount: share.amount,
    currency: share.currency ?? "EUR",
  }));
}

function buildPaymentAction(
  overrides: Partial<PaymentAction> &
    Pick<
      PaymentAction,
      "id" | "groupId" | "payerId" | "payeeId" | "amount" | "currency" | "status"
    >,
): PaymentAction {
  return {
    createdAt,
    ...overrides,
  };
}

test("core package exports participant selection functions", () => {
  assert.equal(typeof core, "object");
  assert.equal(typeof core.getPausedParticipantsForDate, "function");
  assert.equal(typeof core.getActiveParticipantsForDate, "function");
  assert.equal(typeof core.buildDefaultExpenseParticipantSelection, "function");
  assert.equal(typeof core.splitExpenseEqually, "function");
  assert.equal(typeof core.calculateBalances, "function");
  assert.equal(typeof core.calculateGroupBalances, "function");
  assert.equal(typeof core.calculateActivityBalances, "function");
  assert.equal(typeof core.calculatePersonalBalanceSummary, "function");
});

test("all context members are active when no pause exists", () => {
  const contextMembers = [
    buildContextMember("user-a"),
    buildContextMember("user-b"),
    buildContextMember("user-c"),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities: [],
    }),
    ["user-a", "user-b", "user-c"],
  );
});

test("context-specific paused participant is excluded on affected date", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  const selection = core.buildDefaultExpenseParticipantSelection({
    contextId: tripContextId,
    expenseDate: "2026-06-09",
    contextMembers,
    memberAvailabilities,
  });

  assert.deepEqual(selection.defaultSelectedParticipantUserIds, ["user-a"]);
  assert.deepEqual(selection.pausedParticipantUserIds, ["user-b"]);
});

test("context-specific paused participant is active before the pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-07",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("context-specific paused participant is active again after the pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-11",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("indefinite pause excludes from the start date onward", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getPausedParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-07-01",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-b"],
  );
});

test("group-wide pause excludes participant in the activity when no context override exists", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a"],
  );
});

test("context-specific available override wins over group-wide pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-group",
      userId: "user-b",
      unavailableFrom: "2026-06-01",
      mode: "paused",
    }),
    buildAvailability({
      id: "availability-context",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-01",
      mode: "available",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("paused participants remain manually selectable through the selection result", () => {
  const contextMembers = [
    buildContextMember("user-a"),
    buildContextMember("user-b"),
    buildContextMember("user-c"),
    buildContextMember("user-z", otherContextId),
  ];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-c",
      unavailableFrom: "2026-06-08",
      mode: "paused",
    }),
  ];

  const selection = core.buildDefaultExpenseParticipantSelection({
    contextId: tripContextId,
    expenseDate: "2026-06-09",
    contextMembers,
    memberAvailabilities,
  });

  assert.deepEqual(selection.defaultSelectedParticipantUserIds, ["user-a", "user-b"]);
  assert.deepEqual(selection.pausedParticipantUserIds, ["user-c"]);
  assert.deepEqual(selection.manuallySelectableParticipantUserIds, [
    "user-a",
    "user-b",
    "user-c",
  ]);
});

test("equal split divides 30,00 EUR between three participants", () => {
  assert.deepEqual(
    core.splitExpenseEqually({
      amount: 3000,
      currency: "EUR",
      participantUserIds: ["user-c", "user-a", "user-b"],
    }),
    [
      { userId: "user-a", amount: 1000, currency: "EUR" },
      { userId: "user-b", amount: 1000, currency: "EUR" },
      { userId: "user-c", amount: 1000, currency: "EUR" },
    ],
  );
});

test("equal split distributes remainder cents deterministically to lowest sorted user ids", () => {
  assert.deepEqual(
    core.splitExpenseEqually({
      amount: 1000,
      currency: "EUR",
      participantUserIds: ["user-c", "user-a", "user-b"],
    }),
    [
      { userId: "user-a", amount: 334, currency: "EUR" },
      { userId: "user-b", amount: 333, currency: "EUR" },
      { userId: "user-c", amount: 333, currency: "EUR" },
    ],
  );
});

test("payer who is also a participant is net receivable for the other participants' shares", () => {
  const expense = buildExpense({
    id: "expense-1",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });

  const balances = core.calculateBalances({
    expenses: [expense],
    expenseShares: buildExpenseShares(expense.id, [
      { userId: "user-a", amount: 1000 },
      { userId: "user-b", amount: 1000 },
      { userId: "user-c", amount: 1000 },
    ]),
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 2000 },
    { userId: "user-b", currency: "EUR", amount: -1000 },
    { userId: "user-c", currency: "EUR", amount: -1000 },
  ]);
});

test("multiple expenses in one group aggregate correctly", () => {
  const expenseA = buildExpense({
    id: "expense-a",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });
  const expenseB = buildExpense({
    id: "expense-b",
    groupId,
    contextId: tripContextId,
    amount: 1500,
    currency: "EUR",
    paidByUserId: "user-b",
    date: "2026-06-10",
  });

  const balances = core.calculateGroupBalances({
    groupId,
    expenses: [expenseA, expenseB],
    expenseShares: [
      ...buildExpenseShares(expenseA.id, [
        { userId: "user-a", amount: 1000 },
        { userId: "user-b", amount: 1000 },
        { userId: "user-c", amount: 1000 },
      ]),
      ...buildExpenseShares(expenseB.id, [
        { userId: "user-a", amount: 500 },
        { userId: "user-b", amount: 500 },
        { userId: "user-c", amount: 500 },
      ]),
    ],
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 1500 },
    { userId: "user-b", currency: "EUR", amount: 0 },
    { userId: "user-c", currency: "EUR", amount: -1500 },
  ]);
});

test("activity balance only includes records for the selected activity", () => {
  const expenseTrip = buildExpense({
    id: "expense-trip",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });
  const expenseOther = buildExpense({
    id: "expense-other",
    groupId,
    contextId: otherContextId,
    amount: 2100,
    currency: "EUR",
    paidByUserId: "user-b",
    date: "2026-06-09",
  });

  const balances = core.calculateActivityBalances({
    groupId,
    contextId: tripContextId,
    expenses: [expenseTrip, expenseOther],
    expenseShares: [
      ...buildExpenseShares(expenseTrip.id, [
        { userId: "user-a", amount: 1000 },
        { userId: "user-b", amount: 1000 },
        { userId: "user-c", amount: 1000 },
      ]),
      ...buildExpenseShares(expenseOther.id, [
        { userId: "user-a", amount: 700 },
        { userId: "user-b", amount: 700 },
        { userId: "user-c", amount: 700 },
      ]),
    ],
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 2000 },
    { userId: "user-b", currency: "EUR", amount: -1000 },
    { userId: "user-c", currency: "EUR", amount: -1000 },
  ]);
});

test("group balance includes multiple activities from the same group", () => {
  const expenseTrip = buildExpense({
    id: "expense-trip",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });
  const expenseOther = buildExpense({
    id: "expense-other",
    groupId,
    contextId: otherContextId,
    amount: 2100,
    currency: "EUR",
    paidByUserId: "user-b",
    date: "2026-06-09",
  });
  const expenseExternalGroup = buildExpense({
    id: "expense-external-group",
    groupId: "group-2",
    contextId: "context-group-2",
    amount: 900,
    currency: "EUR",
    paidByUserId: "user-c",
    date: "2026-06-09",
  });

  const balances = core.calculateGroupBalances({
    groupId,
    expenses: [expenseTrip, expenseOther, expenseExternalGroup],
    expenseShares: [
      ...buildExpenseShares(expenseTrip.id, [
        { userId: "user-a", amount: 1000 },
        { userId: "user-b", amount: 1000 },
        { userId: "user-c", amount: 1000 },
      ]),
      ...buildExpenseShares(expenseOther.id, [
        { userId: "user-a", amount: 700 },
        { userId: "user-b", amount: 700 },
        { userId: "user-c", amount: 700 },
      ]),
      ...buildExpenseShares(expenseExternalGroup.id, [
        { userId: "user-a", amount: 300 },
        { userId: "user-b", amount: 300 },
        { userId: "user-c", amount: 300 },
      ]),
    ],
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 1300 },
    { userId: "user-b", currency: "EUR", amount: 400 },
    { userId: "user-c", currency: "EUR", amount: -1700 },
  ]);
});

test("marked paid payment action reduces the open balance", () => {
  const expense = buildExpense({
    id: "expense-1",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });

  const balances = core.calculateGroupBalances({
    groupId,
    expenses: [expense],
    expenseShares: buildExpenseShares(expense.id, [
      { userId: "user-a", amount: 1000 },
      { userId: "user-b", amount: 1000 },
      { userId: "user-c", amount: 1000 },
    ]),
    paymentActions: [
      buildPaymentAction({
        id: "payment-1",
        groupId,
        contextId: tripContextId,
        payerId: "user-b",
        payeeId: "user-a",
        amount: 600,
        currency: "EUR",
        status: "marked_paid",
        markedPaidAt: createdAt,
      }),
    ],
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 1400 },
    { userId: "user-b", currency: "EUR", amount: -400 },
    { userId: "user-c", currency: "EUR", amount: -1000 },
  ]);
});

test("non-paid payment action statuses do not change balances", () => {
  const expense = buildExpense({
    id: "expense-1",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });

  const balances = core.calculateGroupBalances({
    groupId,
    expenses: [expense],
    expenseShares: buildExpenseShares(expense.id, [
      { userId: "user-a", amount: 1000 },
      { userId: "user-b", amount: 1000 },
      { userId: "user-c", amount: 1000 },
    ]),
    paymentActions: [
      buildPaymentAction({
        id: "payment-suggested",
        groupId,
        contextId: tripContextId,
        payerId: "user-b",
        payeeId: "user-a",
        amount: 600,
        currency: "EUR",
        status: "suggested",
      }),
      buildPaymentAction({
        id: "payment-rejected",
        groupId,
        contextId: tripContextId,
        payerId: "user-c",
        payeeId: "user-a",
        amount: 500,
        currency: "EUR",
        status: "rejected",
        rejectedAt: createdAt,
      }),
    ],
  });

  assert.deepEqual(balances, [
    { userId: "user-a", currency: "EUR", amount: 2000 },
    { userId: "user-b", currency: "EUR", amount: -1000 },
    { userId: "user-c", currency: "EUR", amount: -1000 },
  ]);
});

test("personal summary aggregates net owed and receivable across groups", () => {
  const expenseGroupOne = buildExpense({
    id: "expense-group-1",
    groupId,
    contextId: tripContextId,
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-a",
    date: "2026-06-09",
  });
  const expenseGroupTwo = buildExpense({
    id: "expense-group-2",
    groupId: "group-2",
    contextId: "context-group-2",
    amount: 2000,
    currency: "EUR",
    paidByUserId: "user-b",
    date: "2026-06-10",
  });

  const summary = core.calculatePersonalBalanceSummary({
    userId: "user-a",
    expenses: [expenseGroupOne, expenseGroupTwo],
    expenseShares: [
      ...buildExpenseShares(expenseGroupOne.id, [
        { userId: "user-a", amount: 1000 },
        { userId: "user-b", amount: 1000 },
        { userId: "user-c", amount: 1000 },
      ]),
      ...buildExpenseShares(expenseGroupTwo.id, [
        { userId: "user-a", amount: 1000 },
        { userId: "user-b", amount: 1000 },
      ]),
    ],
  });

  assert.deepEqual(summary, {
    userId: "user-a",
    balances: [
      {
        currency: "EUR",
        netAmount: 1000,
        totalOwed: 0,
        totalReceivable: 1000,
      },
    ],
  });
});

test("cent-based calculations avoid floating-point artifacts", () => {
  const shares = core.splitExpenseEqually({
    amount: 1001,
    currency: "EUR",
    participantUserIds: ["user-a", "user-b", "user-c"],
  });

  assert.equal(
    shares.reduce((total, share) => total + share.amount, 0),
    1001,
  );
  assert.ok(shares.every((share) => Number.isInteger(share.amount)));
});
