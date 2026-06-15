import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getActiveParticipants,
  getPeriodRange,
  isParticipantActiveInPeriod,
  splitPeriodShares,
  type CostPlan,
  type CostPlanParticipant,
} from "./cost-plans";

const NOW = "2026-06-11T12:00:00.000Z";

function makePlan(overrides: Partial<CostPlan> = {}): CostPlan {
  return {
    id: "plan-1",
    ownerUserId: "user-me",
    name: "Streaming Familienabo",
    amount: 1799,
    currency: "EUR",
    intervalKind: "monthly",
    anchorDate: "2026-01-15",
    prepaid: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeParticipant(
  overrides: Partial<CostPlanParticipant> & Pick<CostPlanParticipant, "id">,
): CostPlanParticipant {
  return {
    costPlanId: "plan-1",
    counterpartyId: "cp-anna",
    shareType: "equal",
    joinedAtPeriodIndex: 0,
    createdAt: NOW,
    ...overrides,
  };
}

test("monthly periods derive deterministically from the anchor date", () => {
  const plan = makePlan();

  assert.deepEqual(getPeriodRange(plan, 0), {
    periodIndex: 0,
    periodStart: "2026-01-15",
    periodEnd: "2026-02-15",
  });
  assert.deepEqual(getPeriodRange(plan, 11), {
    periodIndex: 11,
    periodStart: "2026-12-15",
    periodEnd: "2027-01-15",
  });
});

test("monthly periods clamp month-end anchors without drifting", () => {
  const plan = makePlan({ anchorDate: "2026-01-31" });

  // Feb has 28 days in 2026; later months return to the 31st where possible.
  assert.equal(getPeriodRange(plan, 1).periodStart, "2026-02-28");
  assert.equal(getPeriodRange(plan, 2).periodStart, "2026-03-31");
  assert.equal(getPeriodRange(plan, 3).periodStart, "2026-04-30");
});

test("yearly periods span one year (prepaid upfront use case)", () => {
  const plan = makePlan({ intervalKind: "yearly", anchorDate: "2026-03-01", prepaid: true });

  assert.deepEqual(getPeriodRange(plan, 0), {
    periodIndex: 0,
    periodStart: "2026-03-01",
    periodEnd: "2027-03-01",
  });
  assert.equal(getPeriodRange(plan, 2).periodStart, "2028-03-01");
});

test("custom day intervals step by exact day counts and require intervalDays", () => {
  const plan = makePlan({ intervalKind: "custom_days", intervalDays: 28 });

  assert.deepEqual(getPeriodRange(plan, 1), {
    periodIndex: 1,
    periodStart: "2026-02-12",
    periodEnd: "2026-03-12",
  });
  assert.throws(() =>
    getPeriodRange(makePlan({ intervalKind: "custom_days" }), 0),
  );
  assert.throws(() => getPeriodRange(plan, -1));
});

test("participation history activates and ends per period (left is exclusive)", () => {
  const participant = makeParticipant({ id: "p1", joinedAtPeriodIndex: 2, leftAtPeriodIndex: 5 });

  assert.equal(isParticipantActiveInPeriod(participant, 1), false);
  assert.equal(isParticipantActiveInPeriod(participant, 2), true);
  assert.equal(isParticipantActiveInPeriod(participant, 4), true);
  assert.equal(isParticipantActiveInPeriod(participant, 5), false);
});

test("share and participation history works as consecutive records", () => {
  // Anna: equal share for periods 0-2, fixed 500 from period 3; rejoins never
  // mutate old records, so period 1 still resolves to the original share.
  const annaEqual = makeParticipant({ id: "p1", leftAtPeriodIndex: 3 });
  const annaFixed = makeParticipant({
    id: "p2",
    shareType: "fixed",
    shareValue: 500,
    joinedAtPeriodIndex: 3,
  });

  const inPeriod1 = getActiveParticipants([annaEqual, annaFixed], 1);
  const inPeriod4 = getActiveParticipants([annaEqual, annaFixed], 4);

  assert.deepEqual(inPeriod1.map((participant) => participant.id), ["p1"]);
  assert.equal(inPeriod1[0].shareType, "equal");
  assert.deepEqual(inPeriod4.map((participant) => participant.id), ["p2"]);
  assert.equal(inPeriod4[0].shareValue, 500);
});

test("overlapping participation records for the same counterparty are rejected", () => {
  const first = makeParticipant({ id: "p1" });
  const overlapping = makeParticipant({ id: "p2", joinedAtPeriodIndex: 1 });

  assert.throws(() => getActiveParticipants([first, overlapping], 2));
});

// --- splitPeriodShares ---

test("equal split with no participants: owner gets full amount", () => {
  const shares = splitPeriodShares(1000, []);
  assert.equal(shares.length, 1);
  assert.equal(shares[0].counterpartyId, undefined);
  assert.equal(shares[0].amount, 1000);
});

test("equal split: owner counts as one of N+1 heads, remainder to lowest sorted counterparty IDs", () => {
  // 3 participants + 1 owner = 4 heads. 1000 / 4 = 250 each, remainder 0.
  const participants = [
    makeParticipant({ id: "p1", counterpartyId: "cp-anna" }),
    makeParticipant({ id: "p2", counterpartyId: "cp-ben" }),
    makeParticipant({ id: "p3", counterpartyId: "cp-clara" }),
  ];
  const shares = splitPeriodShares(1000, participants);
  // 3 participant entries + 1 owner entry.
  assert.equal(shares.length, 4);
  const total = shares.reduce((s, e) => s + e.amount, 0);
  assert.equal(total, 1000);
  // Each head gets exactly 250 (no remainder).
  for (const share of shares) {
    assert.equal(share.amount, 250);
  }
});

test("equal split remainder goes to lowest sorted counterparty IDs first", () => {
  // 2 participants + 1 owner = 3 heads. 10 / 3 = 3 remainder 1.
  // Sorted: cp-anna < cp-ben. Anna gets base+1=4, Ben gets base=3, owner gets 3.
  const anna = makeParticipant({ id: "p1", counterpartyId: "cp-anna" });
  const ben = makeParticipant({ id: "p2", counterpartyId: "cp-ben" });
  const shares = splitPeriodShares(10, [anna, ben]);
  const byId = Object.fromEntries(shares.map((e) => [e.counterpartyId ?? "owner", e.amount]));
  assert.equal(byId["cp-anna"], 4);
  assert.equal(byId["cp-ben"], 3);
  assert.equal(byId["owner"], 3);
});

test("equal split: owner's share equals floor(amount / headCount)", () => {
  // 1 participant + 1 owner = 2 heads. 7 / 2 = 3 remainder 1.
  // Participant (only one, gets remainder): 4. Owner: 3.
  const p = makeParticipant({ id: "p1", counterpartyId: "cp-anna" });
  const shares = splitPeriodShares(7, [p]);
  const owner = shares.find((e) => e.counterpartyId === undefined);
  assert.equal(owner?.amount, 3);
  assert.equal(shares.find((e) => e.counterpartyId === "cp-anna")?.amount, 4);
});

test("fixed split: participants claim fixed shareValues, owner gets remainder", () => {
  const anna = makeParticipant({
    id: "p1",
    counterpartyId: "cp-anna",
    shareType: "fixed",
    shareValue: 300,
  });
  const ben = makeParticipant({
    id: "p2",
    counterpartyId: "cp-ben",
    shareType: "fixed",
    shareValue: 400,
  });
  const shares = splitPeriodShares(1000, [anna, ben]);
  const byId = Object.fromEntries(shares.map((e) => [e.counterpartyId ?? "owner", e.amount]));
  assert.equal(byId["cp-anna"], 300);
  assert.equal(byId["cp-ben"], 400);
  assert.equal(byId["owner"], 300);
});

test("fixed split: rejects when fixed shares exceed period amount", () => {
  const p = makeParticipant({
    id: "p1",
    counterpartyId: "cp-anna",
    shareType: "fixed",
    shareValue: 1200,
  });
  assert.throws(() => splitPeriodShares(1000, [p]));
});

test("fixed split: rejects participant missing shareValue", () => {
  const p = makeParticipant({ id: "p1", shareType: "fixed" }); // no shareValue
  assert.throws(() => splitPeriodShares(1000, [p]));
});

test("splitPeriodShares rejects mixed equal/fixed share types", () => {
  const eq = makeParticipant({ id: "p1", counterpartyId: "cp-anna" });
  const fixed = makeParticipant({
    id: "p2",
    counterpartyId: "cp-ben",
    shareType: "fixed",
    shareValue: 200,
  });
  assert.throws(() => splitPeriodShares(1000, [eq, fixed]));
});

test("splitPeriodShares rejects non-integer period amount", () => {
  const p = makeParticipant({ id: "p1" });
  assert.throws(() => splitPeriodShares(9.99, [p]));
});
