import {
  buildPersonBalanceOverview,
  claimsToPersonPositions,
  deriveClaimLifecycle,
  getClaimRemainingAmount,
  getDueReminders,
  groupBalancesToPersonPositions,
  isClaimClosed,
  isLinkedClaim,
  isReminderActive,
  summarizeClaimsByPerson,
  type Claim,
  type ClaimEvent,
  type ClaimPayment,
  type ClaimReminder,
  type Counterparty,
  type EntityId,
  type PersonBalanceOverview,
} from "@payment-divider/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../services/supabase-client";
import {
  createClaim,
  disableClaimReminderRow,
  getOrCreateCounterpartyId,
  insertClaimReminder,
  recordClaimPayment,
  snoozeClaimReminderRow,
  transitionClaim,
} from "../services/supabase-claim-writes";
import { mockClaimsRepository } from "./claims-store";
import { notifyExternalDataChanged } from "./local-ledger";
import { getSupabaseLedgerData } from "./supabase-repositories";
import type {
  AddClaimInput,
  ClaimGroupOption,
  ClaimListItem,
  ClaimsOverviewData,
  ClaimsRepository,
} from "./claims-repository";
import type { WriteResult } from "./repositories";

// supabase-local claims adapter behind the ClaimsRepository interface.
// Reads target the local Supabase stack; RLS decides visibility (own
// counterparties and claims, plus incoming claims explicitly shared with this
// user). The person balance overview stays derived in the client via core —
// there is no person-balance table. While the initial fetch is pending the
// adapter falls back to the local-demo store with a dev hint.

interface ClaimsRemoteData {
  counterparties: Counterparty[];
  claims: Claim[];
  payments: ClaimPayment[];
  events: ClaimEvent[];
  // RLS already restricts these to the current user's own reminders.
  reminders: ClaimReminder[];
  profileNames: Map<EntityId, string>;
}

type LoadState = "idle" | "loading" | "ready" | "error";

let loadState: LoadState = "idle";
let loadErrorMessage: string | undefined;
let remote: ClaimsRemoteData | undefined;
let currentUserId: EntityId | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapCounterparty(row: Row): Counterparty {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    kind: row.kind,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    linkedUserId: row.linked_user_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapClaim(row: Row): Claim {
  return {
    id: row.id,
    creatorUserId: row.creator_user_id,
    direction: row.direction,
    counterpartyId: row.counterparty_id,
    sharedWithCounterparty: row.shared_with_counterparty,
    amount: row.amount_minor,
    currency: row.currency_code,
    purpose: row.purpose ?? undefined,
    claimDate: row.claim_date,
    dueDate: row.due_date ?? undefined,
    groupId: row.group_id ?? undefined,
    contextId: row.context_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapClaimPayment(row: Row): ClaimPayment {
  return {
    id: row.id,
    claimId: row.claim_id,
    amount: row.amount_minor,
    currency: row.currency_code,
    paymentDate: row.payment_date,
    note: row.note ?? undefined,
    recordedBy: row.recorded_by,
    confirmationStatus: row.confirmation_status,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
  };
}

function mapClaimReminder(row: Row): ClaimReminder {
  return {
    id: row.id,
    claimId: row.claim_id,
    userId: row.user_id,
    remindAt: row.remind_at,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    disabledAt: row.disabled_at ?? undefined,
  };
}

function mapClaimEvent(row: Row): ClaimEvent {
  return {
    id: row.id,
    claimId: row.claim_id,
    actorUserId: row.actor_user_id ?? undefined,
    eventType: row.event_type,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function selectAll(client: SupabaseClient, table: string): Promise<Row[]> {
  const { data, error } = await client.from(table).select("*");
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  return data ?? [];
}

async function loadClaimsData(client: SupabaseClient): Promise<void> {
  const session = await client.auth.getSession();
  currentUserId = session.data.session?.user.id;

  const [counterparties, claims, payments, events, reminders, profiles] =
    await Promise.all([
      selectAll(client, "counterparties"),
      selectAll(client, "claims"),
      selectAll(client, "claim_payments"),
      selectAll(client, "claim_events"),
      selectAll(client, "claim_reminders"),
      selectAll(client, "profiles"),
    ]);

  remote = {
    counterparties: counterparties.map(mapCounterparty),
    claims: claims.map(mapClaim),
    payments: payments.map(mapClaimPayment),
    events: events.map(mapClaimEvent),
    reminders: reminders.map(mapClaimReminder),
    profileNames: new Map(
      profiles.map((row) => [row.id as EntityId, row.display_name as string]),
    ),
  };
}

function ensureLoaded(): ClaimsRemoteData | undefined {
  if (loadState === "ready") {
    return remote;
  }
  if (loadState === "idle") {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    loadState = "loading";
    loadClaimsData(client)
      .then(() => {
        loadState = "ready";
        notifyExternalDataChanged();
      })
      .catch((error: unknown) => {
        loadState = "error";
        loadErrorMessage = error instanceof Error ? error.message : String(error);
        notifyExternalDataChanged();
      });
  }
  return undefined;
}

// Drops the cached snapshot so the next read refetches, e.g. after a write or
// when the dev session changes.
export function reloadSupabaseClaims(): void {
  loadState = "idle";
  remote = undefined;
  loadErrorMessage = undefined;
  notifyExternalDataChanged();
}

function getStatusHint(): string {
  switch (loadState) {
    case "ready":
      return currentUserId
        ? "supabase-local · Forderungen aus der lokalen Datenbank"
        : "supabase-local · keine Session: RLS blendet alle Forderungen aus (Dev-Hinweis)";
    case "error":
      return `supabase-local · Ladefehler: ${loadErrorMessage ?? "unbekannt"} · Fallback auf local-demo Daten`;
    case "loading":
      return "supabase-local · lädt Forderungen · zeigt solange local-demo Daten";
    default:
      return "supabase-local · nicht initialisiert";
  }
}

// RLS hides the creator's private counterparty record from the incoming side.
// For incoming shared claims (visible ⇒ shared with this linked user) a
// synthetic linked counterparty record stands in, so core applies the linked
// payment-confirmation rules and the creator's profile name is displayed.
// The synthetic record never leaves this adapter and is never written back.
function effectiveCounterparties(data: ClaimsRemoteData): Counterparty[] {
  const known = new Set(data.counterparties.map((counterparty) => counterparty.id));
  const synthetic: Counterparty[] = [];
  for (const claim of data.claims) {
    if (claim.creatorUserId === currentUserId || known.has(claim.counterpartyId)) {
      continue;
    }
    known.add(claim.counterpartyId);
    synthetic.push({
      id: claim.counterpartyId,
      ownerUserId: claim.creatorUserId,
      kind: "app_user",
      displayName: data.profileNames.get(claim.creatorUserId) ?? claim.creatorUserId,
      normalizedName: "",
      linkedUserId: currentUserId,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    });
  }
  return [...data.counterparties, ...synthetic];
}

function ownCounterparties(data: ClaimsRemoteData): Counterparty[] {
  return data.counterparties.filter(
    (counterparty) =>
      counterparty.ownerUserId === currentUserId && !counterparty.archivedAt,
  );
}

function groupNameFromLedger(groupId: EntityId | undefined): string | undefined {
  if (!groupId) {
    return undefined;
  }
  return (
    getSupabaseLedgerData()?.groups.find((group) => group.id === groupId)?.name ?? groupId
  );
}

// Own active reminder for one claim. RLS already scopes the loaded rows to
// the current user; the user filter stays as defense in depth.
function activeOwnReminder(
  data: ClaimsRemoteData,
  claimId: EntityId,
): ClaimReminder | undefined {
  return data.reminders.find(
    (reminder) =>
      reminder.claimId === claimId &&
      reminder.userId === currentUserId &&
      isReminderActive(reminder),
  );
}

function toListItem(data: ClaimsRemoteData, claim: Claim): ClaimListItem {
  const allCounterparties = effectiveCounterparties(data);
  const claimPayments = data.payments.filter((payment) => payment.claimId === claim.id);
  const counterparty = data.counterparties.find(
    (candidate) => candidate.id === claim.counterpartyId,
  );
  const incoming = claim.creatorUserId !== currentUserId;
  const reminder = activeOwnReminder(data, claim.id);
  return {
    claim,
    counterparty,
    counterpartyName: incoming
      ? data.profileNames.get(claim.creatorUserId) ?? claim.creatorUserId
      : counterparty?.displayName ?? claim.counterpartyId,
    groupName: groupNameFromLedger(claim.groupId),
    remaining: getClaimRemainingAmount(claim, claimPayments, allCounterparties),
    lifecycle: deriveClaimLifecycle(claim, claimPayments, allCounterparties),
    linked: isLinkedClaim(claim, allCounterparties),
    incoming,
    canReact: incoming && (claim.status === "linked_open" || claim.status === "disputed"),
    payments: claimPayments,
    events: data.events
      .filter((event) => event.claimId === claim.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    reminder,
    reminderDue:
      reminder !== undefined &&
      currentUserId !== undefined &&
      getDueReminders([reminder], currentUserId, new Date().toISOString()).length > 0,
  };
}

// Per-person view from the current user's perspective: incoming claims count
// as "owed by me" and are re-keyed to the current user's own counterparty
// record for the creator, when one exists.
function claimsFromCurrentUserPerspective(data: ClaimsRemoteData): Claim[] {
  return data.claims.map((claim) => {
    if (claim.creatorUserId === currentUserId) {
      return claim;
    }
    const ownRecordForCreator = ownCounterparties(data).find(
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

function buildClaimsOverview(data: ClaimsRemoteData): ClaimsOverviewData {
  const allCounterparties = effectiveCounterparties(data);
  const items = data.claims.map((claim) => toListItem(data, claim));

  return {
    summaries: summarizeClaimsByPerson(
      claimsFromCurrentUserPerspective(data),
      data.payments,
      allCounterparties,
    ),
    openClaims: items.filter(
      (item) => !isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
    closedClaims: items.filter((item) =>
      isClaimClosed(item.claim, item.payments, allCounterparties),
    ),
  };
}

// Person balance overview stays a pure client-side derivation (issue #89):
// open private claims plus pairwise group balances from the already loaded
// ledger data. No person-balance table exists or is queried.
function buildOverviewPositions(data: ClaimsRemoteData): PersonBalanceOverview[] {
  const allCounterparties = effectiveCounterparties(data);
  const ledger = currentUserId ? getSupabaseLedgerData() : undefined;
  const positions = [
    ...claimsToPersonPositions(
      claimsFromCurrentUserPerspective(data),
      data.payments,
      allCounterparties,
    ),
    ...(ledger && currentUserId
      ? groupBalancesToPersonPositions({
          expenses: ledger.expenses,
          expenseShares: ledger.expenseShares,
          paymentActions: ledger.paymentActions,
          currentUserId,
          counterparties: ownCounterparties(data),
        }).map((position) => ({
          ...position,
          label: ledger.groups.find((group) => group.id === position.sourceId)?.name,
        }))
      : []),
  ];
  return buildPersonBalanceOverview({ positions, counterparties: allCounterparties });
}

async function withSession(
  run: (client: SupabaseClient, userId: string) => Promise<WriteResult>,
): Promise<WriteResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Kein Supabase-Client konfiguriert (siehe .env.example)." };
  }
  if (!currentUserId) {
    return { ok: false, message: "Keine lokale Dev-Session aktiv (Profil-Tab)." };
  }
  const result = await run(client, currentUserId);
  if (result.ok) {
    reloadSupabaseClaims();
  }
  return result;
}

function findClaim(claimId: EntityId): Claim | undefined {
  return remote?.claims.find((claim) => claim.id === claimId);
}

export const supabaseClaimsRepository: ClaimsRepository = {
  getCounterparties: () => {
    const data = ensureLoaded();
    return data ? ownCounterparties(data) : mockClaimsRepository.getCounterparties();
  },
  getClaimGroupOptions: (): ClaimGroupOption[] => {
    const groups = getSupabaseLedgerData()?.groups;
    return groups
      ? groups.map((group) => ({ id: group.id, name: group.name }))
      : mockClaimsRepository.getClaimGroupOptions();
  },
  getClaimsOverview: () => {
    const data = ensureLoaded();
    return data ? buildClaimsOverview(data) : mockClaimsRepository.getClaimsOverview();
  },
  getPersonBalanceOverview: () => {
    const data = ensureLoaded();
    return data
      ? buildOverviewPositions(data)
      : mockClaimsRepository.getPersonBalanceOverview();
  },
  getClaimsStatusHint: () => getStatusHint(),
  addClaim: (input: AddClaimInput) =>
    withSession(async (client, userId) => {
      let counterpartyId = input.counterpartyId;
      let counterpartyKind: string | undefined = remote?.counterparties.find(
        (candidate) => candidate.id === counterpartyId,
      )?.kind;
      if (!counterpartyId && input.newCounterparty) {
        const created = await getOrCreateCounterpartyId(
          client,
          userId,
          input.newCounterparty,
        );
        if (!created.counterpartyId) {
          return { ok: false, message: created.error ?? "Person anlegen fehlgeschlagen." };
        }
        counterpartyId = created.counterpartyId;
        counterpartyKind = input.newCounterparty.kind;
      }
      if (!counterpartyId || !counterpartyKind) {
        return { ok: false, message: "Person nicht gefunden." };
      }
      return createClaim(client, userId, {
        direction: input.direction,
        counterpartyId,
        counterpartyKind,
        amount: input.amount,
        purpose: input.purpose,
        claimDate: new Date().toISOString().slice(0, 10),
        dueDate: input.dueDate,
        groupId: input.groupId,
      });
    }),
  recordClaimPayment: (claimId, amount) =>
    withSession(async (client, userId) => {
      const data = remote;
      const claim = findClaim(claimId);
      if (!claim || !data || amount <= 0) {
        return { ok: false, message: "Teilzahlung nicht möglich." };
      }
      return recordClaimPayment(client, userId, {
        claim,
        amount,
        paymentDate: new Date().toISOString().slice(0, 10),
        linked: isLinkedClaim(claim, effectiveCounterparties(data)),
      });
    }),
  acknowledgeClaim: (claimId) =>
    withSession(async (client, userId) => {
      const claim = findClaim(claimId);
      if (!claim) {
        return { ok: false, message: "Forderung nicht gefunden." };
      }
      return transitionClaim(client, userId, claim, "debtor_acknowledged", "claim_acknowledged");
    }),
  disputeClaim: (claimId) =>
    withSession(async (client, userId) => {
      const claim = findClaim(claimId);
      if (!claim) {
        return { ok: false, message: "Forderung nicht gefunden." };
      }
      return transitionClaim(client, userId, claim, "disputed", "claim_disputed");
    }),
  archiveClaim: (claimId) =>
    withSession(async (client, userId) => {
      const claim = findClaim(claimId);
      if (!claim) {
        return { ok: false, message: "Forderung nicht gefunden." };
      }
      return transitionClaim(client, userId, claim, "archived", "claim_archived");
    }),
  setClaimReminder: (claimId, remindAt) =>
    withSession(async (client, userId) => {
      if (!remote) {
        return { ok: false, message: "Forderungen noch nicht geladen." };
      }
      if (activeOwnReminder(remote, claimId)) {
        return { ok: false, message: "Es gibt schon eine aktive Erinnerung." };
      }
      return insertClaimReminder(client, userId, claimId, remindAt);
    }),
  snoozeClaimReminder: (claimId, remindAt) =>
    withSession(async (client) => {
      const reminder = remote ? activeOwnReminder(remote, claimId) : undefined;
      if (!reminder) {
        return { ok: false, message: "Keine aktive Erinnerung." };
      }
      return snoozeClaimReminderRow(client, reminder, remindAt);
    }),
  disableClaimReminder: (claimId) =>
    withSession(async (client, userId) => {
      const reminder = remote ? activeOwnReminder(remote, claimId) : undefined;
      if (!reminder) {
        return { ok: false, message: "Keine aktive Erinnerung." };
      }
      return disableClaimReminderRow(client, userId, reminder, new Date().toISOString());
    }),
};
