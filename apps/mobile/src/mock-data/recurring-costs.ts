import type { CostPlan, CostPlanParticipant } from "@payment-divider/core";

import { MOCK_COUNTERPARTY_IDS } from "./claims";
import { MOCK_CURRENT_USER_ID } from "./ledger";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

export const MOCK_COST_PLANS: CostPlan[] = [
  {
    id: "cost-plan-netflix",
    ownerUserId: MOCK_CURRENT_USER_ID,
    name: "Netflix",
    amount: 1499,
    currency: "EUR",
    intervalKind: "monthly",
    anchorDate: "2026-01-01",
    prepaid: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "cost-plan-spotify",
    ownerUserId: MOCK_CURRENT_USER_ID,
    name: "Spotify Familie",
    amount: 1699,
    currency: "EUR",
    intervalKind: "monthly",
    anchorDate: "2026-03-01",
    prepaid: false,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "cost-plan-haftpflicht",
    ownerUserId: MOCK_CURRENT_USER_ID,
    name: "Haftpflicht WG",
    amount: 8400,
    currency: "EUR",
    intervalKind: "yearly",
    anchorDate: "2025-01-01",
    prepaid: true,
    archivedAt: "2026-04-01T00:00:00.000Z",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const MOCK_COST_PLAN_PARTICIPANTS: CostPlanParticipant[] = [
  {
    id: "cost-participant-netflix-anna",
    costPlanId: "cost-plan-netflix",
    counterpartyId: MOCK_COUNTERPARTY_IDS.anna,
    shareType: "equal",
    joinedAtPeriodIndex: 0,
    createdAt: CREATED_AT,
  },
  {
    id: "cost-participant-netflix-lukas",
    costPlanId: "cost-plan-netflix",
    counterpartyId: MOCK_COUNTERPARTY_IDS.lukas,
    shareType: "equal",
    joinedAtPeriodIndex: 0,
    createdAt: CREATED_AT,
  },
  {
    id: "cost-participant-spotify-anna",
    costPlanId: "cost-plan-spotify",
    counterpartyId: MOCK_COUNTERPARTY_IDS.anna,
    shareType: "equal",
    joinedAtPeriodIndex: 0,
    createdAt: CREATED_AT,
  },
  {
    id: "cost-participant-spotify-jana",
    costPlanId: "cost-plan-spotify",
    counterpartyId: MOCK_COUNTERPARTY_IDS.jana,
    shareType: "equal",
    joinedAtPeriodIndex: 0,
    createdAt: CREATED_AT,
  },
  {
    id: "cost-participant-haftpflicht-lukas",
    costPlanId: "cost-plan-haftpflicht",
    counterpartyId: MOCK_COUNTERPARTY_IDS.lukas,
    shareType: "fixed",
    shareValue: 2800,
    joinedAtPeriodIndex: 0,
    createdAt: CREATED_AT,
  },
];
