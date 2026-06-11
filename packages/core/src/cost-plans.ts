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
