import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getActiveParticipants,
  getPeriodRange,
  isParticipantActiveInPeriod,
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
