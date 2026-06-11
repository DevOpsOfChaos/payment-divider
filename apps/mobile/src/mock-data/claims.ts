import type { Claim, ClaimEvent, ClaimPayment } from "@payment-divider/core";

import { MOCK_CURRENT_USER_ID, MOCK_GROUP_IDS, MOCK_USER_IDS } from "./ledger";

const CREATED_AT = "2026-06-09T12:00:00.000Z";

// Seed claims for the local demo (see docs/product/private-claims-v0.1.md).
// Mix of linked, invited, and free-text counterparties plus one incoming
// claim where the current user is the linked counterparty.

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "claim-anna-festival",
    creatorUserId: MOCK_CURRENT_USER_ID,
    direction: "owed_to_me",
    counterpartyType: "app_user",
    counterpartyUserId: MOCK_USER_IDS.anna,
    counterpartyName: "Anna",
    amount: 4500,
    currency: "EUR",
    purpose: "Festival-Ticket ausgelegt",
    claimDate: "2026-06-01",
    dueDate: "2026-07-01",
    groupId: MOCK_GROUP_IDS.friends,
    status: "debtor_acknowledged",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "claim-kiosk-karl",
    creatorUserId: MOCK_CURRENT_USER_ID,
    direction: "owed_to_me",
    counterpartyType: "free_text_person",
    counterpartyName: "Kiosk Karl",
    amount: 700,
    currency: "EUR",
    purpose: "Pfandflaschen verauslagt",
    claimDate: "2026-06-08",
    status: "private_open",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "claim-invited-jana",
    creatorUserId: MOCK_CURRENT_USER_ID,
    direction: "owed_by_me",
    counterpartyType: "invited_person",
    counterpartyName: "Jana (einladen)",
    amount: 2500,
    currency: "EUR",
    purpose: "Konzertkarte, zahle ich zurück",
    claimDate: "2026-06-05",
    status: "private_open",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "claim-incoming-lukas",
    creatorUserId: MOCK_USER_IDS.lukas,
    direction: "owed_to_me",
    counterpartyType: "app_user",
    counterpartyUserId: MOCK_CURRENT_USER_ID,
    counterpartyName: "Manu",
    amount: 1200,
    currency: "EUR",
    purpose: "Pizza beim Spieleabend",
    claimDate: "2026-06-07",
    status: "linked_open",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const MOCK_CLAIM_PAYMENTS: ClaimPayment[] = [
  {
    id: "claim-payment-anna-1",
    claimId: "claim-anna-festival",
    amount: 1500,
    currency: "EUR",
    paymentDate: "2026-06-06",
    note: "Erste Rate bar",
    recordedBy: MOCK_USER_IDS.anna,
    confirmationStatus: "confirmed",
    createdAt: CREATED_AT,
    confirmedAt: CREATED_AT,
  },
];

export const MOCK_CLAIM_EVENTS: ClaimEvent[] = [
  {
    id: "claim-event-anna-1",
    claimId: "claim-anna-festival",
    actorUserId: MOCK_CURRENT_USER_ID,
    eventType: "claim_created",
    createdAt: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "claim-event-anna-2",
    claimId: "claim-anna-festival",
    actorUserId: MOCK_USER_IDS.anna,
    eventType: "claim_acknowledged",
    createdAt: "2026-06-02T09:00:00.000Z",
  },
  {
    id: "claim-event-anna-3",
    claimId: "claim-anna-festival",
    actorUserId: MOCK_USER_IDS.anna,
    eventType: "payment_recorded",
    createdAt: "2026-06-06T18:00:00.000Z",
  },
];
