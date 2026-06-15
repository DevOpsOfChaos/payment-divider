import type {
  CurrencyCode,
  EntityId,
  ISODateString,
  ISODateTimeString,
} from "./domain-types";

// Recurring cost plans / shared subscriptions (issue #92, see
// docs/product/shared-subscriptions-v0.1.md). A cost plan is a rule that
// generates expected periods — never transactions: no auto-debit, no provider
// integration, no payment data. This module ships the data model and the
// deterministic period/participation groundwork only; share splitting,
// settlements and the person-balance producer are follow-up work.

export type CostPlanIntervalKind = "monthly" | "yearly" | "custom_days";

export interface CostPlan {
  id: EntityId;
  ownerUserId: EntityId;
  name: string;
  // Current amount in minor units; periods snapshot the amount valid at
  // generation time, so changing it affects future periods only.
  amount: number;
  currency: CurrencyCode;
  intervalKind: CostPlanIntervalKind;
  // Required iff intervalKind === "custom_days".
  intervalDays?: number;
  // First period start; all period boundaries derive deterministically from
  // anchorDate + periodIndex.
  anchorDate: ISODateString;
  // true: owner pays ahead for the whole period (e.g. yearly insurance) and
  // participants settle their share against that one long period.
  prepaid: boolean;
  groupId?: EntityId;
  contextId?: EntityId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  archivedAt?: ISODateTimeString;
}

export type CostPlanShareType = "equal" | "fixed";

// One participation phase of a counterparty (#88). History is modelled as
// records, not mutation: leaving closes the record via leftAtPeriodIndex,
// re-joining or changing a share starts a new record. The owner is not listed
// — their own share is the implicit remainder.
export interface CostPlanParticipant {
  id: EntityId;
  costPlanId: EntityId;
  counterpartyId: EntityId;
  shareType: CostPlanShareType;
  // Fixed share amount in minor units; unused for "equal".
  shareValue?: number;
  joinedAtPeriodIndex: number;
  // Exclusive: the participant is no longer active in this period.
  leftAtPeriodIndex?: number;
  createdAt: ISODateTimeString;
}

export type CostPlanPeriodStatus =
  | "expected"
  | "partially_settled"
  | "settled"
  | "skipped";

// Materialized occurrence of the plan rule. Snapshots the amount so price
// changes never rewrite history; settled/skipped periods stay visible as
// history and stop producing open positions.
export interface CostPlanPeriod {
  id: EntityId;
  costPlanId: EntityId;
  periodIndex: number;
  periodStart: ISODateString;
  // Exclusive: the next period starts on this date.
  periodEnd: ISODateString;
  amount: number;
  status: CostPlanPeriodStatus;
  createdAt: ISODateTimeString;
}

export type CostPlanEventType =
  | "plan_created"
  | "amount_changed"
  | "participant_joined"
  | "participant_left"
  | "share_changed"
  | "period_generated"
  | "period_skipped"
  | "settlement_recorded"
  | "settlement_confirmed"
  | "settlement_rejected"
  | "plan_archived";

export interface CostPlanEvent {
  id: EntityId;
  costPlanId: EntityId;
  actorUserId?: EntityId;
  eventType: CostPlanEventType;
  createdAt: ISODateTimeString;
}

function parseIsoDate(date: ISODateString): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): ISODateString {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Adds calendar months, clamping the day to the target month's length
// (anchor Jan 31 → Feb 28/29, not Mar 2/3).
function addMonthsClamped(date: ISODateString, months: number): ISODateString {
  const { year, month, day } = parseIsoDate(date);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return formatIsoDate(targetYear, targetMonth, Math.min(day, daysInTargetMonth));
}

function addDays(date: ISODateString, days: number): ISODateString {
  const { year, month, day } = parseIsoDate(date);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return formatIsoDate(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

export interface CostPlanPeriodRange {
  periodIndex: number;
  periodStart: ISODateString;
  // Exclusive.
  periodEnd: ISODateString;
}

// Deterministic period boundaries from the plan rule. Period i of a monthly
// plan anchored on the 31st clamps to shorter months without drifting.
export function getPeriodRange(plan: CostPlan, periodIndex: number): CostPlanPeriodRange {
  if (!Number.isInteger(periodIndex) || periodIndex < 0) {
    throw new Error("periodIndex must be a non-negative integer.");
  }
  switch (plan.intervalKind) {
    case "monthly":
      return {
        periodIndex,
        periodStart: addMonthsClamped(plan.anchorDate, periodIndex),
        periodEnd: addMonthsClamped(plan.anchorDate, periodIndex + 1),
      };
    case "yearly":
      return {
        periodIndex,
        periodStart: addMonthsClamped(plan.anchorDate, periodIndex * 12),
        periodEnd: addMonthsClamped(plan.anchorDate, (periodIndex + 1) * 12),
      };
    case "custom_days": {
      if (!Number.isInteger(plan.intervalDays) || (plan.intervalDays ?? 0) <= 0) {
        throw new Error(`Cost plan ${plan.id} needs a positive intervalDays for custom_days.`);
      }
      const days = plan.intervalDays as number;
      return {
        periodIndex,
        periodStart: addDays(plan.anchorDate, periodIndex * days),
        periodEnd: addDays(plan.anchorDate, (periodIndex + 1) * days),
      };
    }
  }
}

export function isParticipantActiveInPeriod(
  participant: CostPlanParticipant,
  periodIndex: number,
): boolean {
  return (
    periodIndex >= participant.joinedAtPeriodIndex &&
    (participant.leftAtPeriodIndex === undefined ||
      periodIndex < participant.leftAtPeriodIndex)
  );
}

// Active participation records for one period. With history-as-records, a
// counterparty has at most one active record per period; overlapping records
// for the same counterparty are a data error and rejected.
export function getActiveParticipants(
  participants: CostPlanParticipant[],
  periodIndex: number,
): CostPlanParticipant[] {
  const active = participants.filter((participant) =>
    isParticipantActiveInPeriod(participant, periodIndex),
  );
  const seen = new Set<EntityId>();
  for (const participant of active) {
    if (seen.has(participant.counterpartyId)) {
      throw new Error(
        `Counterparty ${participant.counterpartyId} has overlapping participation records in period ${periodIndex}.`,
      );
    }
    seen.add(participant.counterpartyId);
  }
  return active;
}

export type CostPlanSettlementConfirmationStatus =
  | "recorded"
  | "pending_confirmation"
  | "confirmed"
  | "rejected";

// Ledger-only settlement against one participant's share in one period.
// Mirrors ClaimPayment semantics: only confirmed settlements reduce the open
// position. No auto-debit, no payment provider, no banking data.
export interface CostPlanSettlement {
  id: EntityId;
  costPlanId: EntityId;
  costPlanPeriodId: EntityId;
  counterpartyId: EntityId;
  amount: number;
  settledDate: ISODateString;
  confirmationStatus: CostPlanSettlementConfirmationStatus;
  createdAt: ISODateTimeString;
}

// Per-head share for one period. counterpartyId undefined = owner's implicit
// remainder (period.amount − sum of participant shares).
export interface CostPlanShareEntry {
  counterpartyId: EntityId | undefined;
  amount: number;
}

// Splits a period's amount among the active participants and the implicit
// owner head. For equal splits the owner counts as one head (N+1 total);
// remainder cents go to the lowest sorted counterparty IDs. For fixed splits
// each participant claims their shareValue and the owner gets the remainder.
// Mixed equal/fixed within a single period is not supported.
export function splitPeriodShares(
  periodAmount: number,
  activeParticipants: CostPlanParticipant[],
): CostPlanShareEntry[] {
  if (!Number.isInteger(periodAmount) || periodAmount < 0) {
    throw new Error("periodAmount must be a non-negative integer.");
  }
  if (activeParticipants.length === 0) {
    return [{ counterpartyId: undefined, amount: periodAmount }];
  }

  const shareTypes = new Set(activeParticipants.map((p) => p.shareType));
  if (shareTypes.size > 1) {
    throw new Error(
      "Mixed equal/fixed share types within the same period are not supported.",
    );
  }

  if (activeParticipants[0].shareType === "fixed") {
    let totalFixed = 0;
    for (const p of activeParticipants) {
      if (p.shareValue === undefined) {
        throw new Error(`Participant ${p.id} has shareType "fixed" but no shareValue.`);
      }
      if (!Number.isInteger(p.shareValue) || p.shareValue < 0) {
        throw new Error(
          `shareValue of participant ${p.id} must be a non-negative integer.`,
        );
      }
      totalFixed += p.shareValue;
    }
    if (totalFixed > periodAmount) {
      throw new Error(
        `Sum of fixed shares (${totalFixed}) exceeds period amount (${periodAmount}).`,
      );
    }
    return [
      ...activeParticipants.map((p) => ({
        counterpartyId: p.counterpartyId,
        amount: p.shareValue as number,
      })),
      { counterpartyId: undefined, amount: periodAmount - totalFixed },
    ];
  }

  // Equal: N participants + 1 owner = N+1 heads.
  const headCount = activeParticipants.length + 1;
  const base = Math.floor(periodAmount / headCount);
  const remainder = periodAmount % headCount;
  const sorted = [...activeParticipants].sort((a, b) =>
    a.counterpartyId.localeCompare(b.counterpartyId),
  );
  const entries: CostPlanShareEntry[] = sorted.map((p, i) => ({
    counterpartyId: p.counterpartyId,
    amount: base + (i < remainder ? 1 : 0),
  }));
  const ownerAmount = periodAmount - entries.reduce((sum, e) => sum + e.amount, 0);
  return [...entries, { counterpartyId: undefined, amount: ownerAmount }];
}
