import assert from "node:assert/strict";
import { test } from "node:test";

import type { Claim, ClaimPayment } from "./claims";
import type { Counterparty } from "./counterparties";
import type { Expense, ExpenseShare, PaymentAction } from "./domain-types";
import {
  buildPersonBalanceOverview,
  claimsToPersonPositions,
  groupBalancesToPersonPositions,
  type PersonBalancePosition,
} from "./person-balance";

const NOW = "2026-06-11T12:00:00.000Z";

function makeCounterparty(
  overrides: Partial<Counterparty> & Pick<Counterparty, "id">,
): Counterparty {
  return {
    ownerUserId: "user-me",
    kind: "external_person",
    displayName: "Kiosk Karl",
    normalizedName: "kiosk karl",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const LINKED_ANNA = makeCounterparty({
  id: "cp-anna",
  kind: "app_user",
  displayName: "Anna",
  normalizedName: "anna",
  linkedUserId: "user-anna",
});

const EXTERNAL_KARL = makeCounterparty({ id: "cp-karl" });

const COUNTERPARTIES = [LINKED_ANNA, EXTERNAL_KARL];

function makeClaim(overrides: Partial<Claim> & Pick<Claim, "id">): Claim {
  return {
    creatorUserId: "user-me",
    direction: "owed_to_me",
    counterpartyId: EXTERNAL_KARL.id,
    sharedWithCounterparty: false,
    amount: 5000,
    currency: "EUR",
    claimDate: "2026-06-01",
    status: "private_open",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makePayment(
  overrides: Partial<ClaimPayment> & Pick<ClaimPayment, "id" | "claimId" | "amount">,
): ClaimPayment {
  return {
    currency: "EUR",
    paymentDate: "2026-06-05",
    recordedBy: "user-me",
    confirmationStatus: "recorded",
    createdAt: NOW,
    ...overrides,
  };
}

function overviewFor(positions: PersonBalancePosition[]) {
  return buildPersonBalanceOverview({ positions, counterparties: COUNTERPARTIES });
}

test("overview shows what a person owes me", () => {
  const claims = [makeClaim({ id: "c1", counterpartyId: LINKED_ANNA.id, amount: 3000 })];
  const overview = overviewFor(claimsToPersonPositions(claims, [], COUNTERPARTIES));

  assert.equal(overview.length, 1);
  assert.equal(overview[0].counterpartyName, "Anna");
  assert.equal(overview[0].openOwedToMe, 3000);
  assert.equal(overview[0].openOwedByMe, 0);
  assert.equal(overview[0].netAmount, 3000);
});

test("overview shows what I owe a person", () => {
  const claims = [
    makeClaim({ id: "c1", counterpartyId: LINKED_ANNA.id, direction: "owed_by_me", amount: 1500 }),
  ];
  const overview = overviewFor(claimsToPersonPositions(claims, [], COUNTERPARTIES));

  assert.equal(overview[0].openOwedToMe, 0);
  assert.equal(overview[0].openOwedByMe, 1500);
  assert.equal(overview[0].netAmount, -1500);
});

test("net is correct while gross positions stay visible", () => {
  // Issue #89 example: Anna owes me 30 + 12 + 4.99, I owe Anna 15 → net 31.99.
  const claims = [
    makeClaim({ id: "c1", counterpartyId: LINKED_ANNA.id, amount: 3000, purpose: "Einkauf" }),
    makeClaim({ id: "c2", counterpartyId: LINKED_ANNA.id, amount: 1200, purpose: "Taxi" }),
    makeClaim({ id: "c3", counterpartyId: LINKED_ANNA.id, amount: 499, purpose: "Netflix" }),
    makeClaim({
      id: "c4",
      counterpartyId: LINKED_ANNA.id,
      direction: "owed_by_me",
      amount: 1500,
      purpose: "Konzertticket",
    }),
  ];
  const overview = overviewFor(claimsToPersonPositions(claims, [], COUNTERPARTIES));

  assert.equal(overview.length, 1);
  assert.equal(overview[0].netAmount, 3199);
  assert.equal(overview[0].openOwedToMe, 4699);
  assert.equal(overview[0].openOwedByMe, 1500);
  // Gross positions are not netted away.
  assert.equal(overview[0].openPositions.length, 4);
  assert.deepEqual(
    overview[0].openPositions.map((position) => position.amount).sort((a, b) => a - b),
    [499, 1200, 1500, 3000],
  );
});

test("closed positions are excluded from open set and net but kept as history", () => {
  const claims = [
    makeClaim({ id: "open", counterpartyId: LINKED_ANNA.id, amount: 2000 }),
    makeClaim({ id: "settled", counterpartyId: LINKED_ANNA.id, amount: 1000 }),
  ];
  const payments = [
    makePayment({ id: "p1", claimId: "settled", amount: 1000, confirmationStatus: "confirmed" }),
  ];
  const overview = overviewFor(claimsToPersonPositions(claims, payments, COUNTERPARTIES));

  assert.equal(overview[0].netAmount, 2000);
  assert.equal(overview[0].openPositions.length, 1);
  assert.equal(overview[0].openPositions[0].sourceId, "open");
  assert.equal(overview[0].closedPositions.length, 1);
  assert.equal(overview[0].closedPositions[0].sourceId, "settled");
  // History keeps the original amount.
  assert.equal(overview[0].closedPositions[0].amount, 1000);
});

test("partial payments reduce the open position amount", () => {
  const claims = [makeClaim({ id: "c1", amount: 5000 })];
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 2000 })];
  const overview = overviewFor(claimsToPersonPositions(claims, payments, COUNTERPARTIES));

  assert.equal(overview[0].openPositions[0].amount, 3000);
  assert.equal(overview[0].netAmount, 3000);
});

test("linked shared claims ignore unconfirmed payments in the overview", () => {
  // Privacy/linking rule: on a shared linked claim only creditor-confirmed
  // payments count, so a counterparty-recorded payment must not shrink the
  // open position.
  const claims = [
    makeClaim({
      id: "c1",
      counterpartyId: LINKED_ANNA.id,
      sharedWithCounterparty: true,
      status: "linked_open",
      amount: 4000,
    }),
  ];
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 4000, recordedBy: "user-anna" }),
  ];
  const overview = overviewFor(claimsToPersonPositions(claims, payments, COUNTERPARTIES));

  assert.equal(overview[0].openPositions.length, 1);
  assert.equal(overview[0].openPositions[0].amount, 4000);
  assert.equal(overview[0].closedPositions.length, 0);
});

test("unshared claims against linked counterparties stay in private payment mode", () => {
  // sharedWithCounterparty=false keeps the claim private even though the
  // counterparty is a linked app user: recorded payments count directly.
  const claims = [
    makeClaim({
      id: "c1",
      counterpartyId: LINKED_ANNA.id,
      sharedWithCounterparty: false,
      amount: 4000,
    }),
  ];
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 4000 })];
  const overview = overviewFor(claimsToPersonPositions(claims, payments, COUNTERPARTIES));

  assert.equal(overview[0].openPositions.length, 0);
  assert.equal(overview[0].closedPositions.length, 1);
  assert.equal(overview[0].netAmount, 0);
});

const GROUP_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    groupId: "group-1",
    contextId: "ctx-1",
    amount: 3000,
    currency: "EUR",
    paidByUserId: "user-me",
    date: "2026-06-01",
    createdBy: "user-me",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const GROUP_SHARES: ExpenseShare[] = [
  { id: "s1", expenseId: "exp-1", userId: "user-me", shareType: "equal", amount: 1000, currency: "EUR" },
  { id: "s2", expenseId: "exp-1", userId: "user-anna", shareType: "equal", amount: 1000, currency: "EUR" },
  { id: "s3", expenseId: "exp-1", userId: "user-leo", shareType: "equal", amount: 1000, currency: "EUR" },
];

test("group balances become pairwise positions for linked counterparties only", () => {
  const positions = groupBalancesToPersonPositions({
    expenses: GROUP_EXPENSES,
    expenseShares: GROUP_SHARES,
    currentUserId: "user-me",
    counterparties: COUNTERPARTIES,
  });

  // user-leo has no counterparty record → skipped; Anna owes her share.
  assert.equal(positions.length, 1);
  assert.equal(positions[0].counterpartyId, LINKED_ANNA.id);
  assert.equal(positions[0].sourceType, "group_balance");
  assert.equal(positions[0].sourceId, "group-1");
  assert.equal(positions[0].direction, "owed_to_me");
  assert.equal(positions[0].amount, 1000);
});

test("settled payment actions close out pairwise group positions", () => {
  const paymentActions: PaymentAction[] = [
    {
      id: "pay-1",
      groupId: "group-1",
      payerId: "user-anna",
      payeeId: "user-me",
      amount: 1000,
      currency: "EUR",
      status: "confirmed",
      createdAt: NOW,
    },
  ];
  const positions = groupBalancesToPersonPositions({
    expenses: GROUP_EXPENSES,
    expenseShares: GROUP_SHARES,
    paymentActions,
    currentUserId: "user-me",
    counterparties: COUNTERPARTIES,
  });

  assert.equal(positions.length, 1);
  assert.equal(positions[0].closed, true);
  assert.equal(positions[0].amount, 0);
});

test("claims and group balances combine into one overview per person", () => {
  const claims = [
    makeClaim({
      id: "c1",
      counterpartyId: LINKED_ANNA.id,
      direction: "owed_by_me",
      amount: 1500,
    }),
  ];
  const positions = [
    ...claimsToPersonPositions(claims, [], COUNTERPARTIES),
    ...groupBalancesToPersonPositions({
      expenses: GROUP_EXPENSES,
      expenseShares: GROUP_SHARES,
      currentUserId: "user-me",
      counterparties: COUNTERPARTIES,
    }),
  ];
  const overview = overviewFor(positions);

  assert.equal(overview.length, 1);
  assert.equal(overview[0].openPositions.length, 2);
  assert.equal(overview[0].openOwedToMe, 1000);
  assert.equal(overview[0].openOwedByMe, 1500);
  assert.equal(overview[0].netAmount, -500);
});

test("overview separates currencies per person", () => {
  const claims = [
    makeClaim({ id: "c1", counterpartyId: LINKED_ANNA.id, amount: 1000 }),
    makeClaim({ id: "c2", counterpartyId: LINKED_ANNA.id, amount: 2000, currency: "USD" }),
  ];
  const overview = overviewFor(claimsToPersonPositions(claims, [], COUNTERPARTIES));

  assert.equal(overview.length, 2);
  assert.deepEqual(
    overview.map((row) => row.currency),
    ["EUR", "USD"],
  );
});

test("non-integer position amounts are rejected", () => {
  assert.throws(() =>
    buildPersonBalanceOverview({
      positions: [
        {
          sourceType: "private_claim",
          sourceId: "c1",
          counterpartyId: LINKED_ANNA.id,
          direction: "owed_to_me",
          amount: 10.5,
          currency: "EUR",
          closed: false,
        },
      ],
      counterparties: COUNTERPARTIES,
    }),
  );
});
