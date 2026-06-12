import {
  buildPersonBalanceOverview,
  canTransitionClaimStatus,
  claimsToPersonPositions,
  deriveClaimLifecycle,
  disableReminder,
  getClaimRemainingAmount,
  getDueReminders,
  groupBalancesToPersonPositions,
  isClaimClosed,
  isLinkedClaim,
  isReminderActive,
  normalizeCounterpartyName,
  snoozeReminder,
  summarizeClaimsByPerson,
  type Claim,
  type ClaimEvent,
  type ClaimPayment,
  type ClaimReminder,
  type Counterparty,
  type EntityId,
  type PersonBalanceOverview,
} from "@payment-divider/core";

import {
  MOCK_CLAIM_EVENTS,
  MOCK_CLAIM_PAYMENTS,
  MOCK_CLAIMS,
  MOCK_COUNTERPARTIES,
} from "../mock-data/claims";
import { getBalanceInput } from "../mock-data/balance-derived";
import { MOCK_CURRENT_USER_ID, MOCK_GROUPS, MOCK_USERS } from "../mock-data/ledger";
import { notifyExternalDataChanged } from "./local-ledger";
import type {
  AddClaimInput,
  ClaimListItem,
  ClaimsOverviewData,
  ClaimsRepository,
  NewCounterpartyInput,
} from "./claims-repository";
import type { WriteResult } from "./repositories";

// Session-only claims store for the local demo. Claims reference reusable
// counterparty records; free-text persons are created once and reused.
// Nothing here syncs, executes payments, or affects group balances.

let counterparties: readonly Counterparty[] = MOCK_COUNTERPARTIES;
let claims: readonly Claim[] = MOCK_CLAIMS;
let payments: readonly ClaimPayment[] = MOCK_CLAIM_PAYMENTS;
let events: readonly ClaimEvent[] = MOCK_CLAIM_EVENTS;
// Personal reminders (session-only, start empty): self-set memory aids that
// are never sent anywhere and never visible to the other side.
let reminders: readonly ClaimReminder[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function ownCounterparties(): Counterparty[] {
  return counterparties.filter(
    (counterparty) =>
      counterparty.ownerUserId === MOCK_CURRENT_USER_ID && !counterparty.archivedAt,
  );
}

// Creates a reusable person record. If the owner already has a counterparty
// with the same normalized name, that one is reused instead of creating a
// duplicate (creation-time reuse only — merging existing records stays a
// future, user-confirmed flow).
function getOrCreateCounterparty(input: NewCounterpartyInput): Counterparty {
  const normalized = normalizeCounterpartyName(input.displayName);
  const existing = ownCounterparties().find(
    (counterparty) => counterparty.normalizedName === normalized,
  );
  if (existing) {
    return existing;
  }

  const created: Counterparty = {
    id: `cp-${Date.now()}-${counterparties.length}`,
    ownerUserId: MOCK_CURRENT_USER_ID,
    kind: input.kind,
    displayName: input.displayName.trim(),
    normalizedName: normalized,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  counterparties = [...counterparties, created];
  return created;
}

function appendEvent(claimId: EntityId, eventType: ClaimEvent["eventType"]): void {
  events = [
    ...events,
    {
      id: `claim-event-${Date.now()}-${events.length}`,
      claimId,
      actorUserId: MOCK_CURRENT_USER_ID,
      eventType,
      createdAt: nowIso(),
    },
  ];
}

function updateClaim(claimId: EntityId, patch: Partial<Claim>): void {
  claims = claims.map((claim) =>
    claim.id === claimId ? { ...claim, ...patch, updatedAt: nowIso() } : claim,
  );
}

function addClaim(input: AddClaimInput): WriteResult {
  let counterparty = input.counterpartyId
    ? counterparties.find((candidate) => candidate.id === input.counterpartyId)
    : undefined;
  if (!counterparty && input.newCounterparty) {
    counterparty = getOrCreateCounterparty(input.newCounterparty);
  }
  if (!counterparty) {
    return { ok: false, message: "Person nicht gefunden." };
  }
  const linked = counterparty.kind === "app_user";
  const id = `claim-${Date.now()}-${claims.length}`;
  claims = [
    ...claims,
    {
      id,
      creatorUserId: MOCK_CURRENT_USER_ID,
      direction: input.direction,
      counterpartyId: counterparty.id,
      // New claims against linked persons are shared by default; claims
      // against unlinked persons stay private.
      sharedWithCounterparty: linked,
      amount: input.amount,
      currency: "EUR",
      purpose: input.purpose,
      claimDate: nowIso().slice(0, 10),
      dueDate: input.dueDate,
      groupId: input.groupId,
      status: linked ? "linked_open" : "private_open",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  ];
  appendEvent(id, "claim_created");
  notifyExternalDataChanged();
  return { ok: true, message: "Forderung lokal gespeichert." };
}

function recordClaimPayment(claimId: EntityId, amount: number): WriteResult {
  const claim = claims.find((candidate) => candidate.id === claimId);
  if (!claim || amount <= 0) {
    return { ok: false, message: "Teilzahlung nicht möglich." };
  }
  payments = [
    ...payments,
    {
      id: `claim-payment-${Date.now()}-${payments.length}`,
      claimId,
      amount,
      currency: claim.currency,
      paymentDate: nowIso().slice(0, 10),
      recordedBy: MOCK_CURRENT_USER_ID,
      // Linked claims need creditor confirmation; for the demo the current
      // user is the creditor of their own claims and confirms directly.
      confirmationStatus:
        isLinkedClaim(claim, [...counterparties]) &&
        claim.creatorUserId !== MOCK_CURRENT_USER_ID
          ? "pending_confirmation"
          : "confirmed",
      createdAt: nowIso(),
      confirmedAt: nowIso(),
    },
  ];
  appendEvent(claimId, "payment_recorded");
  notifyExternalDataChanged();
  return { ok: true, message: "Teilzahlung erfasst." };
}

// Validated status change: rejects transitions the dispute workflow forbids
// (e.g. disputing a private claim or reviving an archived one).
function applyClaimTransition(
  claimId: EntityId,
  to: Claim["status"],
  eventType: ClaimEvent["eventType"],
): WriteResult {
  const claim = claims.find((candidate) => candidate.id === claimId);
  if (!claim || !canTransitionClaimStatus(claim.status, to)) {
    return { ok: false, message: "Statuswechsel nicht erlaubt." };
  }
  updateClaim(claimId, {
    status: to,
    archivedAt: to === "archived" ? nowIso() : claim.archivedAt,
  });
  appendEvent(claimId, eventType);
  notifyExternalDataChanged();
  return { ok: true, message: "Status aktualisiert." };
}

function activeOwnReminder(claimId: EntityId): ClaimReminder | undefined {
  return reminders.find(
    (reminder) =>
      reminder.claimId === claimId &&
      reminder.userId === MOCK_CURRENT_USER_ID &&
      isReminderActive(reminder),
  );
}

function setClaimReminder(claimId: EntityId, remindAt: string): WriteResult {
  const claim = claims.find((candidate) => candidate.id === claimId);
  if (!claim) {
    return { ok: false, message: "Forderung nicht gefunden." };
  }
  if (activeOwnReminder(claimId)) {
    return { ok: false, message: "Es gibt schon eine aktive Erinnerung." };
  }
  reminders = [
    ...reminders,
    {
      id: `claim-reminder-${Date.now()}-${reminders.length}`,
      claimId,
      userId: MOCK_CURRENT_USER_ID,
      remindAt,
      createdAt: nowIso(),
    },
  ];
  appendEvent(claimId, "reminder_set");
  notifyExternalDataChanged();
  return { ok: true, message: "Erinnerung gesetzt (nur für dich)." };
}

function snoozeClaimReminder(claimId: EntityId, remindAt: string): WriteResult {
  const reminder = activeOwnReminder(claimId);
  if (!reminder) {
    return { ok: false, message: "Keine aktive Erinnerung." };
  }
  let snoozed: ClaimReminder;
  try {
    snoozed = snoozeReminder(reminder, remindAt);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
  reminders = reminders.map((candidate) =>
    candidate.id === reminder.id ? snoozed : candidate,
  );
  notifyExternalDataChanged();
  return { ok: true, message: "Erinnerung verschoben." };
}

function disableClaimReminder(claimId: EntityId): WriteResult {
  const reminder = activeOwnReminder(claimId);
  if (!reminder) {
    return { ok: false, message: "Keine aktive Erinnerung." };
  }
  const disabled = disableReminder(reminder, nowIso());
  reminders = reminders.map((candidate) =>
    candidate.id === reminder.id ? disabled : candidate,
  );
  appendEvent(claimId, "reminder_cleared");
  notifyExternalDataChanged();
  return { ok: true, message: "Erinnerung deaktiviert." };
}

function groupName(groupId: EntityId | undefined): string | undefined {
  if (!groupId) {
    return undefined;
  }
  return MOCK_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;
}

function toListItem(claim: Claim): ClaimListItem {
  const claimPayments = payments.filter((payment) => payment.claimId === claim.id);
  const allCounterparties = [...counterparties];
  const counterparty = counterparties.find(
    (candidate) => candidate.id === claim.counterpartyId,
  );
  const incoming = claim.creatorUserId !== MOCK_CURRENT_USER_ID;
  const reminder = activeOwnReminder(claim.id);
  return {
    claim,
    counterparty,
    counterpartyName: incoming
      ? MOCK_USERS.find((user) => user.id === claim.creatorUserId)?.displayName ??
        claim.creatorUserId
      : counterparty?.displayName ?? claim.counterpartyId,
    groupName: groupName(claim.groupId),
    remaining: getClaimRemainingAmount(claim, claimPayments, allCounterparties),
    lifecycle: deriveClaimLifecycle(claim, claimPayments, allCounterparties),
    linked: isLinkedClaim(claim, allCounterparties),
    incoming,
    canReact:
      incoming &&
      counterparty?.linkedUserId === MOCK_CURRENT_USER_ID &&
      (claim.status === "linked_open" || claim.status === "disputed"),
    payments: claimPayments,
    events: events
      .filter((event) => event.claimId === claim.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    reminder,
    reminderDue: reminder
      ? getDueReminders([reminder], MOCK_CURRENT_USER_ID, nowIso()).length > 0
      : false,
  };
}

// Per-person view from the current user's perspective: incoming claims
// (created by someone else against the current user) count as "owed by me"
// and are keyed to the creator's own counterparty record for them.
function claimsFromCurrentUserPerspective(): Claim[] {
  return claims.map((claim) => {
    if (claim.creatorUserId === MOCK_CURRENT_USER_ID) {
      return claim;
    }
    // Re-key the incoming claim to the current user's own counterparty record
    // for the creator, when one exists.
    const ownRecordForCreator = ownCounterparties().find(
      (counterparty) => counterparty.linkedUserId === claim.creatorUserId,
    );
    return {
      ...claim,
      counterpartyId: ownRecordForCreator?.id ?? claim.counterpartyId,
      direction:
        claim.direction === "owed_to_me"
          ? ("owed_by_me" as const)
          : ("owed_to_me" as const),
    };
  });
}

// Person balance overview (issue #89): combines open private claims with
// pairwise group balances per counterparty. Gross positions stay visible,
// net is only a summary; closed positions are returned separately as history.
// Recurring costs are a prepared source type without a producer yet.
function getPersonBalanceOverview(): PersonBalanceOverview[] {
  const allCounterparties = [...counterparties];
  const positions = [
    ...claimsToPersonPositions(
      claimsFromCurrentUserPerspective(),
      [...payments],
      allCounterparties,
    ),
    ...groupBalancesToPersonPositions({
      ...getBalanceInput(),
      currentUserId: MOCK_CURRENT_USER_ID,
      counterparties: ownCounterparties(),
    }).map((position) => ({
      ...position,
      label: groupName(position.sourceId),
    })),
  ];
  return buildPersonBalanceOverview({ positions, counterparties: allCounterparties });
}

function getClaimsOverview(): ClaimsOverviewData {
  const allPayments = [...payments];
  const allCounterparties = [...counterparties];
  const items = claims.map(toListItem);
  const summaryClaims = claimsFromCurrentUserPerspective();

  return {
    summaries: summarizeClaimsByPerson(summaryClaims, allPayments, allCounterparties),
    openClaims: items.filter(
      (item) => !isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
    closedClaims: items.filter((item) =>
      isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
  };
}

export const mockClaimsRepository: ClaimsRepository = {
  getCounterparties: () => ownCounterparties(),
  getClaimGroupOptions: () =>
    MOCK_GROUPS.map((group) => ({ id: group.id, name: group.name })),
  getClaimsOverview,
  getPersonBalanceOverview,
  getClaimsStatusHint: () => undefined,
  addClaim: async (input) => addClaim(input),
  recordClaimPayment: async (claimId, amount) => recordClaimPayment(claimId, amount),
  acknowledgeClaim: async (claimId) =>
    applyClaimTransition(claimId, "debtor_acknowledged", "claim_acknowledged"),
  disputeClaim: async (claimId) =>
    applyClaimTransition(claimId, "disputed", "claim_disputed"),
  archiveClaim: async (claimId) =>
    applyClaimTransition(claimId, "archived", "claim_archived"),
  setClaimReminder: async (claimId, remindAt) => setClaimReminder(claimId, remindAt),
  snoozeClaimReminder: async (claimId, remindAt) =>
    snoozeClaimReminder(claimId, remindAt),
  disableClaimReminder: async (claimId) => disableClaimReminder(claimId),
};
