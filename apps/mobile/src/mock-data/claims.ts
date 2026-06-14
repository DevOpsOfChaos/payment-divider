import type { Claim, ClaimEvent, ClaimPayment, ClaimReminder, Counterparty } from "@payment-divider/core";

import { MOCK_CURRENT_USER_ID, MOCK_GROUP_IDS, MOCK_USER_IDS } from "./ledger";

const CREATED_AT = "2026-06-09T12:00:00.000Z";

// Seed counterparties and claims for the local demo
// (see docs/product/private-claims-v0.1.md). Claims reference reusable
// counterparty records instead of per-claim free-text names.

export const MOCK_COUNTERPARTY_IDS = {
  anna: "cp-anna",
  jana: "cp-jana",
  kioskKarl: "cp-kiosk-karl",
  lukas: "cp-lukas",
  // Lukas' own record pointing at the current user (incoming claim).
  manuByLukas: "cp-manu-by-lukas",
} as const;

export const MOCK_COUNTERPARTIES: Counterparty[] = [
  {
    id: MOCK_COUNTERPARTY_IDS.anna,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: "app_user",
    displayName: "Anna",
    normalizedName: "anna",
    linkedUserId: MOCK_USER_IDS.anna,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: MOCK_COUNTERPARTY_IDS.jana,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: "invited_person",
    displayName: "Jana",
    normalizedName: "jana",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: MOCK_COUNTERPARTY_IDS.kioskKarl,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: "external_person",
    displayName: "Kiosk Karl",
    normalizedName: "kiosk karl",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: MOCK_COUNTERPARTY_IDS.lukas,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: "app_user",
    displayName: "Lukas",
    normalizedName: "lukas",
    linkedUserId: MOCK_USER_IDS.lukas,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: MOCK_COUNTERPARTY_IDS.manuByLukas,
    ownerUserId: MOCK_USER_IDS.lukas,
    kind: "app_user",
    displayName: "Manu",
    normalizedName: "manu",
    linkedUserId: MOCK_CURRENT_USER_ID,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const MOCK_CLAIMS: Claim[] = [
  {
    id: "claim-anna-festival",
    creatorUserId: MOCK_CURRENT_USER_ID,
    direction: "owed_to_me",
    counterpartyId: MOCK_COUNTERPARTY_IDS.anna,
    sharedWithCounterparty: true,
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
    counterpartyId: MOCK_COUNTERPARTY_IDS.kioskKarl,
    sharedWithCounterparty: false,
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
    counterpartyId: MOCK_COUNTERPARTY_IDS.jana,
    sharedWithCounterparty: false,
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
    counterpartyId: MOCK_COUNTERPARTY_IDS.manuByLukas,
    sharedWithCounterparty: true,
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

// Seed one due reminder for the demo (remind_at in the past → fires on open).
// Reminders are personal: owner only, never sent anywhere, no push.
export const MOCK_CLAIM_REMINDERS: ClaimReminder[] = [
  {
    id: "reminder-jana-concert",
    claimId: "claim-invited-jana",
    userId: MOCK_CURRENT_USER_ID,
    remindAt: "2026-06-10T08:00:00.000Z",
    createdAt: CREATED_AT,
  },
];
