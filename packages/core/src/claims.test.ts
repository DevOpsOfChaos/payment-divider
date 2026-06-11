import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canTransitionClaimStatus,
  deriveClaimLifecycle,
  filterVisibleClaims,
  getClaimPaidAmount,
  getClaimRemainingAmount,
  isClaimClosed,
  isLinkedClaim,
  summarizeClaimsByPerson,
  transitionClaimStatus,
  type Claim,
  type ClaimPayment,
} from "./claims";
import {
  findPotentialDuplicates,
  linkCounterpartyToUser,
  normalizeCounterpartyName,
  type Counterparty,
  type CounterpartyAlias,
} from "./counterparties";

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

test("remaining amount subtracts recorded partial payments on private claims", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 1500 }),
    makePayment({ id: "p2", claimId: "c1", amount: 500 }),
  ];

  assert.equal(getClaimPaidAmount(claim, payments, COUNTERPARTIES), 2000);
  assert.equal(getClaimRemainingAmount(claim, payments, COUNTERPARTIES), 3000);
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

  assert.equal(getClaimRemainingAmount(claim, payments, COUNTERPARTIES), 5000);
});

test("shared claims against linked counterparties only count confirmed payments", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: true,
    status: "linked_open",
  });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 2000, confirmationStatus: "recorded" }),
    makePayment({ id: "p2", claimId: "c1", amount: 1000, confirmationStatus: "confirmed" }),
  ];

  assert.equal(isLinkedClaim(claim, COUNTERPARTIES), true);
  assert.equal(getClaimPaidAmount(claim, payments, COUNTERPARTIES), 1000);
});

test("unshared claims against linked counterparties stay in private mode", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: false,
  });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 2000, confirmationStatus: "recorded" }),
  ];

  assert.equal(isLinkedClaim(claim, COUNTERPARTIES), false);
  assert.equal(getClaimPaidAmount(claim, payments, COUNTERPARTIES), 2000);
});

test("currency mismatch between claim and payment throws", () => {
  const claim = makeClaim({ id: "c1" });
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 100, currency: "USD" })];

  assert.throws(() => getClaimRemainingAmount(claim, payments, COUNTERPARTIES), /currency/);
});

test("lifecycle derives open, partially paid, and settled for private claims", () => {
  const claim = makeClaim({ id: "c1" });

  assert.equal(deriveClaimLifecycle(claim, [], COUNTERPARTIES), "open");
  assert.equal(
    deriveClaimLifecycle(
      claim,
      [makePayment({ id: "p1", claimId: "c1", amount: 2000 })],
      COUNTERPARTIES,
    ),
    "partially_paid",
  );
  assert.equal(
    deriveClaimLifecycle(
      claim,
      [makePayment({ id: "p1", claimId: "c1", amount: 5000 })],
      COUNTERPARTIES,
    ),
    "settled",
  );
});

test("fully paid linked claim stays in progress until creditor confirms", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: true,
    status: "marked_paid",
  });
  const payments = [
    makePayment({ id: "p1", claimId: "c1", amount: 5000, confirmationStatus: "confirmed" }),
  ];

  assert.equal(deriveClaimLifecycle(claim, payments, COUNTERPARTIES), "partially_paid");
  assert.equal(
    deriveClaimLifecycle({ ...claim, status: "creditor_confirmed" }, payments, COUNTERPARTIES),
    "settled",
  );
});

test("disputed and archived take precedence over payment progress", () => {
  const disputed = makeClaim({ id: "c1", status: "disputed" });
  const archived = makeClaim({ id: "c2", status: "archived", archivedAt: NOW });

  assert.equal(deriveClaimLifecycle(disputed, [], COUNTERPARTIES), "disputed");
  assert.equal(deriveClaimLifecycle(archived, [], COUNTERPARTIES), "archived");
  assert.equal(isClaimClosed(archived, [], COUNTERPARTIES), true);
});

test("filterVisibleClaims hides settled and archived by default", () => {
  const open = makeClaim({ id: "c1" });
  const archived = makeClaim({ id: "c2", status: "archived", archivedAt: NOW });
  const paid = makeClaim({ id: "c3" });
  const payments = [makePayment({ id: "p1", claimId: "c3", amount: 5000 })];

  const visible = filterVisibleClaims({
    claims: [open, archived, paid],
    payments,
    counterparties: COUNTERPARTIES,
  });
  assert.deepEqual(
    visible.map((claim) => claim.id),
    ["c1"],
  );

  const all = filterVisibleClaims({
    claims: [open, archived, paid],
    payments,
    counterparties: COUNTERPARTIES,
    includeClosed: true,
  });
  assert.equal(all.length, 3);
});

test("per-person summary aggregates by stable counterparty id", () => {
  const owedToMe = makeClaim({
    id: "c1",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: true,
    amount: 4000,
    status: "linked_open",
  });
  const owedByMe = makeClaim({
    id: "c2",
    direction: "owed_by_me",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: true,
    amount: 1500,
    status: "linked_open",
  });
  // Two claims against the same reusable external person aggregate into one row.
  const karl1 = makeClaim({ id: "c3", amount: 700 });
  const karl2 = makeClaim({ id: "c4", amount: 300 });

  const summaries = summarizeClaimsByPerson(
    [owedToMe, owedByMe, karl1, karl2],
    [],
    COUNTERPARTIES,
  );

  assert.equal(summaries.length, 2);
  const anna = summaries.find((entry) => entry.counterpartyKey === LINKED_ANNA.id);
  assert.ok(anna);
  assert.equal(anna.counterpartyName, "Anna");
  assert.equal(anna.netAmount, 2500);
  assert.equal(anna.openClaimCount, 2);

  const karl = summaries.find((entry) => entry.counterpartyKey === EXTERNAL_KARL.id);
  assert.ok(karl);
  assert.equal(karl.netAmount, 1000);
  assert.equal(karl.openClaimCount, 2);
});

test("settled claims drop out of the per-person summary", () => {
  const claim = makeClaim({ id: "c1", amount: 1000 });
  const payments = [makePayment({ id: "p1", claimId: "c1", amount: 1000 })];

  assert.equal(summarizeClaimsByPerson([claim], payments, COUNTERPARTIES).length, 0);
});

test("non-integer amounts are rejected", () => {
  const claim = makeClaim({ id: "c1", amount: 10.5 });

  assert.throws(() => getClaimRemainingAmount(claim, [], COUNTERPARTIES), /integer/);
});

test("linking a counterparty does not expose existing private claims", () => {
  const external = makeCounterparty({ id: "cp-max", displayName: "Max", normalizedName: "max" });
  const oldClaim = makeClaim({ id: "c1", counterpartyId: external.id });

  const linked = linkCounterpartyToUser(external, "user-max", NOW);

  assert.equal(linked.kind, "app_user");
  assert.equal(linked.linkedUserId, "user-max");
  // The old claim was never shared: it must stay in private mode after linking.
  assert.equal(isLinkedClaim(oldClaim, [linked]), false);
  // Only an explicit creator decision shares it.
  assert.equal(isLinkedClaim({ ...oldClaim, sharedWithCounterparty: true }, [linked]), true);
});

test("linking an already linked counterparty throws", () => {
  assert.throws(() => linkCounterpartyToUser(LINKED_ANNA, "user-other", NOW), /already linked/);
});

test("normalizeCounterpartyName collapses case and whitespace", () => {
  assert.equal(normalizeCounterpartyName("  Max   Müller "), "max müller");
});

test("duplicate detection flags same names and aliases, same owner only", () => {
  const max = makeCounterparty({ id: "cp-1", displayName: "Max", normalizedName: "max" });
  const maxDuplicate = makeCounterparty({ id: "cp-2", displayName: "max", normalizedName: "max" });
  const maxOtherOwner = makeCounterparty({
    id: "cp-3",
    ownerUserId: "user-other",
    displayName: "Max",
    normalizedName: "max",
  });
  const maxMueller = makeCounterparty({
    id: "cp-4",
    displayName: "Max Müller",
    normalizedName: "max müller",
  });
  const aliases: CounterpartyAlias[] = [
    {
      id: "alias-1",
      counterpartyId: "cp-4",
      alias: "Max",
      normalizedAlias: "max",
      createdAt: NOW,
    },
  ];

  const candidates = findPotentialDuplicates([max, maxDuplicate, maxOtherOwner, maxMueller], aliases);

  // cp-2 matches cp-1 by name; cp-4 matches cp-1 and cp-2 via alias. Other
  // owners never match. No merge happens — suggestions only.
  assert.equal(candidates.length, 3);
  assert.ok(
    candidates.every((candidate) => candidate.counterparty.ownerUserId === "user-me"),
  );
});

test("dispute keeps the claim open and visible at the creator", () => {
  const claim = makeClaim({
    id: "c1",
    counterpartyId: LINKED_ANNA.id,
    sharedWithCounterparty: true,
    status: "linked_open",
  });

  const disputed = transitionClaimStatus(claim, "disputed", NOW);

  // Rejection never deletes or closes the claim: lifecycle is "disputed",
  // not settled/archived, so it stays in the creator's open list.
  assert.equal(disputed.status, "disputed");
  assert.equal(deriveClaimLifecycle(disputed, [], COUNTERPARTIES), "disputed");
  assert.equal(isClaimClosed(disputed, [], COUNTERPARTIES), false);
});

test("disputed claims cannot jump straight to settled", () => {
  assert.equal(canTransitionClaimStatus("disputed", "settled"), false);
  assert.equal(canTransitionClaimStatus("disputed", "creditor_confirmed"), false);
  // Clarification path: reopen, take over, or archive by the creator.
  assert.equal(canTransitionClaimStatus("disputed", "linked_open"), true);
  assert.equal(canTransitionClaimStatus("disputed", "debtor_acknowledged"), true);
  assert.equal(canTransitionClaimStatus("disputed", "archived"), true);
});

test("private claims cannot be disputed", () => {
  assert.equal(canTransitionClaimStatus("private_open", "disputed"), false);
  const claim = makeClaim({ id: "c1" });
  assert.throws(() => transitionClaimStatus(claim, "disputed", NOW));
});

test("acknowledging is optional, disputing stays available after acknowledging", () => {
  assert.equal(canTransitionClaimStatus("linked_open", "debtor_acknowledged"), true);
  // No forced confirmation: payments can flow without acknowledgement.
  assert.equal(canTransitionClaimStatus("linked_open", "partially_paid"), true);
  assert.equal(canTransitionClaimStatus("debtor_acknowledged", "disputed"), true);
});

test("archived is terminal and transition sets archivedAt", () => {
  const claim = makeClaim({ id: "c1" });
  const archived = transitionClaimStatus(claim, "archived", NOW);
  assert.equal(archived.archivedAt, NOW);
  assert.equal(canTransitionClaimStatus("archived", "linked_open"), false);
  assert.throws(() => transitionClaimStatus(archived, "private_open", NOW));
});
