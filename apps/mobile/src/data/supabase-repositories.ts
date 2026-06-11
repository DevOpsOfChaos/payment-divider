import {
  calculateActivityBalances,
  calculateGroupBalances,
  calculatePersonalBalanceSummary,
  type ContextMember,
  type EntityId,
  type Expense,
  type ExpenseShare,
  type Group,
  type GroupContext,
  type GroupMember,
  type InboxItem,
  type PaymentAction,
  type TimelineEvent,
  type User,
} from "@payment-divider/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  formatBalanceLabel,
  formatMoney,
  getBalanceTone,
} from "../mock-data/balance-derived";
import { mockRepositories } from "./mock-repositories";
import { notifyExternalDataChanged } from "./local-ledger";
import { getSupabaseClient } from "../services/supabase-client";
import type {
  AppRepositories,
  OverviewData,
  SettlementActionKind,
  SettlementItemData,
} from "./repositories";

// Read-only supabase-local adapter behind the same repository interfaces.
// All reads target the local Supabase stack; there are no writes here.
// While the initial fetch is pending (or when nothing is configured/visible),
// the adapter falls back to the local-demo mock data with a dev hint, so the
// app never crashes in this mode.

interface RemoteData {
  users: User[];
  groups: Group[];
  contexts: GroupContext[];
  members: GroupMember[];
  contextMembers: ContextMember[];
  expenses: Expense[];
  shares: ExpenseShare[];
  actions: PaymentAction[];
  timeline: TimelineEvent[];
  inbox: InboxItem[];
}

type LoadState = "idle" | "loading" | "ready" | "error";

let loadState: LoadState = "idle";
let loadErrorMessage: string | undefined;
let remote: RemoteData | undefined;
let currentUserId: EntityId | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapUser(row: Row): User {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? "",
    email: "",
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapGroup(row: Row): Group {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    defaultCurrency: row.default_currency_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapContext(row: Row): GroupContext {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    type: row.type,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    defaultCurrency: row.default_currency_code ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapMember(row: Row): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    leftAt: row.left_at ?? undefined,
  };
}

function mapContextMember(row: Row): ContextMember {
  return {
    id: row.id,
    contextId: row.context_id,
    userId: row.user_id,
    defaultIncluded: row.default_included,
    joinedAt: row.joined_at,
  };
}

function mapExpense(row: Row): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    contextId: row.context_id,
    amount: row.amount_minor,
    currency: row.currency_code,
    paidByUserId: row.paid_by_user_id,
    date: row.expense_date,
    title: row.title ?? undefined,
    note: row.note ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapShare(row: Row): ExpenseShare {
  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    shareType: row.share_type,
    amount: row.amount_minor,
    currency: row.currency_code,
  };
}

function mapAction(row: Row): PaymentAction {
  return {
    id: row.id,
    groupId: row.group_id,
    contextId: row.context_id ?? undefined,
    payerId: row.payer_id,
    payeeId: row.payee_id,
    amount: row.amount_minor,
    currency: row.currency_code,
    status: row.status,
    createdAt: row.created_at,
    markedPaidAt: row.marked_paid_at ?? undefined,
    confirmedByPayeeAt: row.confirmed_by_payee_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
  };
}

function mapTimelineEvent(row: Row): TimelineEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    contextId: row.context_id ?? undefined,
    actorUserId: row.actor_user_id ?? "",
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id ?? "",
    createdAt: row.created_at,
  };
}

function mapInboxItem(row: Row): InboxItem {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id ?? undefined,
    contextId: row.context_id ?? undefined,
    type: row.type,
    status: row.status,
    relatedEntityType: row.related_entity_type ?? "payment_action",
    relatedEntityId: row.related_entity_id ?? "",
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
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

async function loadRemoteData(client: SupabaseClient): Promise<void> {
  const session = await client.auth.getSession();
  currentUserId = session.data.session?.user.id;

  const [
    users,
    groups,
    contexts,
    members,
    contextMembers,
    expenses,
    shares,
    actions,
    timeline,
    inbox,
  ] = await Promise.all([
    selectAll(client, "profiles"),
    selectAll(client, "groups"),
    selectAll(client, "group_contexts"),
    selectAll(client, "group_members"),
    selectAll(client, "context_members"),
    selectAll(client, "expenses"),
    selectAll(client, "expense_shares"),
    selectAll(client, "payment_actions"),
    selectAll(client, "timeline_events"),
    selectAll(client, "inbox_items"),
  ]);

  remote = {
    users: users.map(mapUser),
    groups: groups.map(mapGroup),
    contexts: contexts.map(mapContext),
    members: members.map(mapMember),
    contextMembers: contextMembers.map(mapContextMember),
    expenses: expenses.map(mapExpense),
    shares: shares.map(mapShare),
    actions: actions.map(mapAction),
    timeline: timeline.map(mapTimelineEvent),
    inbox: inbox.map(mapInboxItem),
  };
}

function ensureLoaded(): RemoteData | undefined {
  if (loadState === "ready") {
    return remote;
  }
  if (loadState === "idle") {
    const client = getSupabaseClient();
    if (!client) {
      return undefined;
    }
    loadState = "loading";
    loadRemoteData(client)
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

// Drops the cached snapshot so the next repository read refetches, e.g. after
// a dev session starts or ends.
export function reloadSupabaseData(): void {
  loadState = "idle";
  remote = undefined;
  loadErrorMessage = undefined;
  notifyExternalDataChanged();
}

export function getSupabaseSessionUserId(): EntityId | undefined {
  return currentUserId;
}

export function getSupabaseDataStatusHint(): string {
  switch (loadState) {
    case "ready":
      return currentUserId
        ? "supabase-local · lokale Daten geladen"
        : "supabase-local · keine Session: RLS blendet alle Daten aus (Dev-Hinweis, siehe docs)";
    case "error":
      return `supabase-local · Ladefehler: ${loadErrorMessage ?? "unbekannt"} · Fallback auf local-demo Daten`;
    case "loading":
      return "supabase-local · lädt lokale Daten · zeigt solange local-demo Daten";
    default:
      return "supabase-local · nicht initialisiert";
  }
}

function getUserName(data: RemoteData, userId: EntityId | undefined): string {
  if (!userId) {
    return "Unbekannt";
  }
  return data.users.find((user) => user.id === userId)?.displayName ?? userId;
}

function balanceInput(data: RemoteData) {
  return {
    expenses: data.expenses,
    expenseShares: data.shares,
    paymentActions: data.actions,
  };
}

function currentUserAmount(
  entries: { userId: EntityId; currency: string; amount: number }[],
): number {
  return entries.find((entry) => entry.userId === currentUserId)?.amount ?? 0;
}

function buildOverview(data: RemoteData): OverviewData {
  const summary = currentUserId
    ? calculatePersonalBalanceSummary({ ...balanceInput(data), userId: currentUserId })
    : undefined;
  const balance = summary?.balances[0];
  const amount = balance?.netAmount ?? 0;

  return {
    balance: {
      heading: "Gesamtsaldo",
      amountLabel: formatBalanceLabel(amount),
      helperText: getSupabaseDataStatusHint(),
      tone: getBalanceTone(amount),
      breakdown: `Forderungen ${formatMoney(balance?.totalReceivable ?? 0)} · Schulden ${formatMoney(
        balance?.totalOwed ?? 0,
      )}`,
    },
    receivables: [],
    debts: [],
    openActions: data.inbox
      .filter((item) => item.status === "open")
      .map((item) => ({
        label: item.type,
        detail: getUserName(data, item.userId),
      })),
    recentActivity: data.timeline.slice(0, 5).map((event) => ({
      actor: getUserName(data, event.actorUserId || undefined),
      event: event.eventType,
      source: data.groups.find((group) => group.id === event.groupId)?.name ?? "",
      dateLabel: event.createdAt.slice(0, 10),
    })),
    groupAttention: [],
  };
}

function buildGroups(data: RemoteData) {
  return data.groups.map((group) => {
    const groupBalance = currentUserAmount(
      calculateGroupBalances({ ...balanceInput(data), groupId: group.id }),
    );
    const activeMembers = data.members.filter(
      (member) => member.groupId === group.id && !member.leftAt,
    );

    return {
      name: group.name,
      contextLabel: group.type,
      memberCount: activeMembers.length,
      balanceTone: getBalanceTone(groupBalance),
      balanceSummary: formatBalanceLabel(groupBalance),
      helperText: "supabase-local · lokale Daten",
      activities: data.contexts
        .filter((context) => context.groupId === group.id)
        .map((context) => ({
          name: context.name,
          summary: formatBalanceLabel(
            currentUserAmount(
              calculateActivityBalances({
                ...balanceInput(data),
                groupId: group.id,
                contextId: context.id,
              }),
            ),
          ),
        })),
    };
  });
}

function buildGroupDetail(data: RemoteData) {
  const group = data.groups[0];
  if (!group) {
    return undefined;
  }
  const groupBalance = currentUserAmount(
    calculateGroupBalances({ ...balanceInput(data), groupId: group.id }),
  );
  const members = data.members.filter(
    (member) => member.groupId === group.id && !member.leftAt,
  );

  return {
    title: group.name,
    subtitle: `${group.type} · ${members.length} Mitglieder · supabase-local`,
    balanceTitle: "Gruppensaldo",
    balanceSummary: formatBalanceLabel(groupBalance),
    balanceTone: getBalanceTone(groupBalance),
    balanceHint: "Aktivitätssalden rollen in diesen Gruppensaldo hoch.",
    activitiesTitle: "Aktivitäten",
    activities: data.contexts
      .filter((context) => context.groupId === group.id)
      .map((context) => {
        const amount = currentUserAmount(
          calculateActivityBalances({
            ...balanceInput(data),
            groupId: group.id,
            contextId: context.id,
          }),
        );
        return {
          name: context.name,
          detail: context.type,
          balanceTone: getBalanceTone(amount),
          balanceSummary: formatBalanceLabel(amount),
        };
      }),
    membersTitle: "Mitglieder",
    membersHint: "Lokale Supabase-Daten, Lesezugriff über RLS.",
    members: members.map((member) => ({
      name: getUserName(data, member.userId),
      status: member.role,
    })),
    timelineTitle: "Timeline",
    timelineHint: "Verlauf zeigt Ledger-Ereignisse, keine Inbox-Aktionen.",
    timeline: data.timeline
      .filter((event) => event.groupId === group.id)
      .slice(0, 10)
      .map((event) => ({
        actor: getUserName(data, event.actorUserId || undefined),
        event: event.eventType,
        dateLabel: event.createdAt.slice(0, 10),
      })),
    quickActionsTitle: "Schnelle Aktionen",
    quickActions: [{ label: "Ausgabe erfassen" }],
  };
}

function buildActivityDetail(data: RemoteData) {
  const groupDetail = data.groups[0];
  const context = data.contexts.find((candidate) => candidate.groupId === groupDetail?.id);
  if (!groupDetail || !context) {
    return undefined;
  }
  const amount = currentUserAmount(
    calculateActivityBalances({
      ...balanceInput(data),
      groupId: groupDetail.id,
      contextId: context.id,
    }),
  );
  const participants = data.contextMembers.filter(
    (member) => member.contextId === context.id,
  );

  return {
    title: context.name,
    subtitle: `${groupDetail.name} · supabase-local`,
    periodLabel: context.startDate
      ? `${context.startDate} – ${context.endDate ?? "offen"}`
      : "Ohne Zeitraum",
    balanceTitle: "Aktivitätssaldo",
    balanceSummary: formatBalanceLabel(amount),
    balanceTone: getBalanceTone(amount),
    balanceHint: "Nur Salden aus dieser Aktivität.",
    activeParticipantsTitle: "Aktive Teilnehmer",
    activeParticipantsHint: "Teilnehmer aus context_members der lokalen Datenbank.",
    activeParticipants: participants.map((member) => ({
      name: getUserName(data, member.userId),
    })),
    pausedParticipantsTitle: "Pausiert",
    pausedParticipantsHint: "Pausen-Auswertung folgt in einem späteren Issue.",
    pausedParticipants: [],
    expensesTitle: "Ausgaben",
    expensesHint: `Ausgaben aus ${context.name}.`,
    expenses: data.expenses
      .filter((expense) => expense.contextId === context.id)
      .map((expense) => ({
        label: expense.title ?? "Ausgabe",
        amount: formatMoney(expense.amount),
      })),
    paymentActionsTitle: "Zahlungsaktionen",
    paymentActionsHint: "Ledger-only: externe Zahlungen werden nur dokumentiert.",
    paymentActions: data.actions
      .filter((action) => action.contextId === context.id)
      .map((action) => ({
        person: getUserName(data, action.payerId),
        amount: formatMoney(action.amount),
        status: action.status,
      })),
    timelineTitle: "Timeline",
    timeline: data.timeline
      .filter((event) => event.contextId === context.id)
      .slice(0, 10)
      .map((event) => ({
        actor: getUserName(data, event.actorUserId || undefined),
        event: event.eventType,
        dateLabel: event.createdAt.slice(0, 10),
      })),
    quickActionsTitle: "Schnelle Aktionen",
    quickActions: [{ label: "Ausgabe erfassen" }],
  };
}

function buildSettlementItems(data: RemoteData): SettlementItemData[] {
  if (!currentUserId) {
    return [];
  }
  return data.actions
    .filter(
      (action) => action.payerId === currentUserId || action.payeeId === currentUserId,
    )
    .map((action) => {
      const role = action.payerId === currentUserId ? "payer" : "payee";
      const counterpartyId = role === "payer" ? action.payeeId : action.payerId;
      let statusLabel = action.status as string;
      let availableActions: SettlementActionKind[] = [];
      if (action.status === "suggested") {
        statusLabel = "Vorschlag offen";
      } else if (action.status === "marked_paid") {
        statusLabel = role === "payee" ? "Bestätigung offen" : "wartet auf Bestätigung";
      } else if (action.status === "confirmed") {
        statusLabel = "bestätigt";
      } else if (action.status === "rejected") {
        statusLabel = "abgelehnt";
      }
      // Read-only adapter: transitions stay disabled until the write adapter
      // issue lands, so no actions are offered here yet.
      availableActions = [];

      return {
        action,
        counterpartyName: getUserName(data, counterpartyId),
        source: data.groups.find((group) => group.id === action.groupId)?.name ?? "",
        role,
        statusLabel: `${statusLabel} · supabase-local read-only`,
        availableActions,
      };
    });
}

export const supabaseRepositories: AppRepositories = {
  getOverview: () => {
    const data = ensureLoaded();
    if (!data) {
      const fallback = mockRepositories.getOverview();
      return {
        ...fallback,
        balance: { ...fallback.balance, helperText: getSupabaseDataStatusHint() },
      };
    }
    return buildOverview(data);
  },
  getGroups: () => {
    const data = ensureLoaded();
    return data ? buildGroups(data) : mockRepositories.getGroups();
  },
  getGroupDetail: () => {
    const data = ensureLoaded();
    const detail = data ? buildGroupDetail(data) : undefined;
    return detail ?? mockRepositories.getGroupDetail();
  },
  getActivityDetail: () => {
    const data = ensureLoaded();
    const detail = data ? buildActivityDetail(data) : undefined;
    return detail ?? mockRepositories.getActivityDetail();
  },
  getRecordSetup: () => mockRepositories.getRecordSetup(),
  getInbox: () => {
    const data = ensureLoaded();
    if (!data) {
      return mockRepositories.getInbox();
    }
    return {
      title: "Inbox",
      subtitle: "supabase-local · Lesezugriff",
      summary: getSupabaseDataStatusHint(),
      items: data.inbox
        .filter((item) => item.status === "open")
        .map((item) => ({
          title: item.type,
          detail: `Bezieht sich auf ${item.relatedEntityType}`,
          source:
            data.groups.find((group) => group.id === item.groupId)?.name ?? "Persönlich",
          status: item.status,
          actionLabel: "Nur Lesezugriff in diesem Modus",
        })),
    };
  },
  getSettlementItems: () => {
    const data = ensureLoaded();
    return data ? buildSettlementItems(data) : mockRepositories.getSettlementItems();
  },
  getProfile: () => {
    const data = ensureLoaded();
    const profile = data?.users.find((user) => user.id === currentUserId);
    const fallback = mockRepositories.getProfile();
    if (!profile) {
      return {
        ...fallback,
        subtitle: getSupabaseDataStatusHint(),
      };
    }
    return {
      ...fallback,
      title: "Profil",
      subtitle: "supabase-local · eigenes Profil aus der lokalen Datenbank",
      identity: [
        { label: "Anzeigename", value: profile.displayName },
        { label: "Username", value: profile.username ? `@${profile.username}` : "—" },
        { label: "E-Mail", value: "in auth.users, hier nicht gespiegelt" },
        { label: "Telefon", value: "nicht gespeichert" },
      ],
    };
  },
};
