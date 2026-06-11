import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveClaimLifecycle,
  filterVisibleClaims,
  getClaimPaidAmount,
  getClaimRemainingAmount,
  isClaimClosed,
  summarizeClaimsByPerson,
  type Claim,
  type ClaimPayment,
} from "./claims";

const NOW = "2026-06-11T12:00:00.000Z";

function makeClaim(overrides: Partial<Claim> & Pick<Claim, "id">): Claim {
  return {
    creatorUserId: "user-me",
    direction: "owed_to_me",
    counterpartyType: "free_text_person",
    counterpartyName: "Kiosk Karl",
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

test("remaining amount subtracts recorded partial payments on private claims", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 1500 }),
    makePayment({ id: "p2", claimId: "c1", amount: 500 }),
  ];

  assert.equal(getClaimPaidAmount(claim, payments), 2000);
  assert.equal(getClaimRemainingAmount(claim, payments), 3000);
});

test("rejected and pending payments never reduce the remainder", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 1000, confirmationStatus: "rejected" }),
    makePayment({
      id: "p2",
      claimId: "c1",
      amount: 1000,
      confirmationStatus: "pending_confirmation",
    }),
  ];

  assert.equal(getClaimRemainingAmount(claim, payments), 5000);
});

test("linked claims only count creditor-confirmed payments", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyType: "app_user",
    counterpartyUserId: "user-anna",
    status: "linked_open",
  });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 2000, confirmationStatus: "recorded" }),
    makePayment({ id: "p2", claimId: "c1", amount: 1000, confirmationStatus: "confirmed" }),
  ];

  assert.equal(getClaimPaidAmount(claim, payments), 1000);
});

test("payments for other claims are ignored", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [makePayment({ id: "p1", claimId: "c-other", amount: 5000 })];

  assert.equal(getClaimRemainingAmount(claim, payments), 5000);
});

test("currency mismatch between claim and payment throws", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 100, currency: "USD" })];

  assert.throws(() => getClaimRemainingAmount(claim, payments), /currency/);
});

test("lifecycle derives open, partially paid, and settled for private claims", () => {
  const claim = makeClaim({ id: "c1" });

  assert.equal(deriveClaimLifecycle(claim, []), "open");
  assert.equal(
    deriveClaimLifecycle(claim, [makePayment({ id: "p1", claimId: "c1", amount: 2000 })]),
    "partially_paid",
  );
  assert.equal(
    deriveClaimLifecycle(claim, [makePayment({ id: "p1", claimId: "c1", amount: 5000 })]),
    "settled",
  );
});

test("fully paid linked claim stays in progress until creditor confirms", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyType: "app_user",
    counterpartyUserId: "user-anna",
    status: "marked_paid",
  });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 5000, confirmationStatus: "confirmed" }),
  ];

  assert.equal(deriveClaimLifecycle(claim, payments), "partially_paid");
  assert.equal(
    deriveClaimLifecycle({ ...claim, status: "creditor_confirmed" }, payments),
    "settled",
  );
});

test("disputed and archived take precedence over payment progress", () => {
  const disputed = makeClaim({ id: "c1", status: "disputed" });
  const archived = makeClaim({ id: "c2", status: "archived", archivedAt: NOW });

  assert.equal(deriveClaimLifecycle(disputed, []), "disputed");
  assert.equal(deriveClaimLifecycle(archived, []), "archived");
  assert.equal(isClaimClosed(archived, []), true);
});

test("filterVisibleClaims hides settled and archived by default", () => {
  const open = makeClaim({ id: "c1" });
  const archived = makeClaim({ id: "c2", status: "archived", archivedAt: NOW });
  const paid = makeClaim({ id: "c3" });
  const payments = [makePayment({ id: "p1", claimId: "c3", amount: 5000 })];

  const visible = filterVisibleClaims({ claims: [open, archived, paid], payments });
  assert.deepEqual(
    visible.map((claim) => claim.id),
    ["c1"],
  );

  const all = filterVisibleClaims({
    claims: [open, archived, paid],
    payments,
    includeClosed: true,
  });
  assert.equal(all.length, 3);
});

test("per-person summary nets both directions per currency", () => {
  const owedToMe = makeClaim({
    id: "c1",
    counterpartyType: "app_user",
    counterpartyUserId: "user-anna",
    counterpartyName: "Anna",
    amount: 4000,
    status: "linked_open",
  });
  const owedByMe = makeClaim({
    id: "c2",
    direction: "owed_by_me",
    counterpartyType: "app_user",
    counterpartyUserId: "user-anna",
    counterpartyName: "Anna",
    amount: 1500,
    status: "linked_open",
  });
  const freeText = makeClaim({ id: "c3", counterpartyName: "Kiosk Karl", amount: 700 });

  const summaries = summarizeClaimsByPerson([owedToMe, owedByMe, freeText], []);

  assert.equal(summaries.length, 2);
  const anna = summaries.find((entry) => entry.counterpartyKey === "user-anna");
  assert.ok(anna);
  assert.equal(anna.openOwedToMe, 4000);
  assert.equal(anna.openOwedByMe, 1500);
  assert.equal(anna.netAmount, 2500);
  assert.equal(anna.openClaimCount, 2);

  const karl = summaries.find((entry) => entry.counterpartyName === "Kiosk Karl");
  assert.ok(karl);
  assert.equal(karl.netAmount, 700);
});

test("settled claims drop out of the per-person summary", () => {
  const claim = makeClaim({ id: "c1", counterpartyName: "Anna", amount: 1000 });
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 1000 })];

  assert.equal(summarizeClaimsByPerson([claim], payments).length, 0);
});

test("non-integer amounts are rejected", () => {
  const claim = makeClaim({ id: "c1", amount: 10.5 });

  assert.throws(() => getClaimRemainingAmount(claim, []), /integer/);
});
