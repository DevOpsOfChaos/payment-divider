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

import {
  formatBalanceLabel,
  formatMoney,
  getBalanceTone,
} from "../mock-data/balance-derived";
import { mockRepositories } from "./mock-repositories";
import { notifyExternalDataChanged } from "./local-ledger";
import type { Database } from "../services/database.types";
import { getSupabaseClient, type AppSupabaseClient } from "../services/supabase-client";
import {
  createExpenseWithShares,
  createGroupWithDefaults,
} from "../services/supabase-writes";
import type {
  AppRepositories,
  OverviewData,
  RecordSetupData,
  SettlementActionKind,
  SettlementItemData,
  WriteResult,
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

// Generated row types: column names and nullability come straight from the
// local schema (database.types.ts, regenerated via `pnpm db:gen-types`).
// Enum-like text columns are constrained by CHECK constraints in the database
// and narrowed to the core unions here.
type Tables = Database["public"]["Tables"];

function mapUser(row: Tables["profiles"]["Row"]): User {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username ?? "",
    email: "",
    createdAt: row.created_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapGroup(row: Tables["groups"]["Row"]): Group {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Group["type"],
    defaultCurrency: row.default_currency_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapContext(row: Tables["group_contexts"]["Row"]): GroupContext {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    type: row.type as GroupContext["type"],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    defaultCurrency: row.default_currency_code ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}

function mapMember(row: Tables["group_members"]["Row"]): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role as GroupMember["role"],
    joinedAt: row.joined_at,
    leftAt: row.left_at ?? undefined,
  };
}

function mapContextMember(row: Tables["context_members"]["Row"]): ContextMember {
  return {
    id: row.id,
    contextId: row.context_id,
    userId: row.user_id,
    defaultIncluded: row.default_included,
    joinedAt: row.joined_at,
  };
}

function mapExpense(row: Tables["expenses"]["Row"]): Expense {
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

function mapShare(row: Tables["expense_shares"]["Row"]): ExpenseShare {
  return {
    id: row.id,
    expenseId: row.expense_id,
    userId: row.user_id,
    shareType: row.share_type as ExpenseShare["shareType"],
    amount: row.amount_minor,
    currency: row.currency_code,
  };
}

function mapAction(row: Tables["payment_actions"]["Row"]): PaymentAction {
  return {
    id: row.id,
    groupId: row.group_id,
    contextId: row.context_id ?? undefined,
    payerId: row.payer_id,
    payeeId: row.payee_id,
    amount: row.amount_minor,
    currency: row.currency_code,
    status: row.status as PaymentAction["status"],
    createdAt: row.created_at,
    markedPaidAt: row.marked_paid_at ?? undefined,
    confirmedByPayeeAt: row.confirmed_by_payee_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
  };
}

function mapTimelineEvent(row: Tables["timeline_events"]["Row"]): TimelineEvent {
  return {
    id: row.id,
    groupId: row.group_id,
    contextId: row.context_id ?? undefined,
    actorUserId: row.actor_user_id ?? "",
    eventType: row.event_type as TimelineEvent["eventType"],
    entityType: row.entity_type as TimelineEvent["entityType"],
    entityId: row.entity_id ?? "",
    createdAt: row.created_at,
  };
}

function mapInboxItem(row: Tables["inbox_items"]["Row"]): InboxItem {
  return {
    id: row.id,
    userId: row.user_id,
    groupId: row.group_id ?? undefined,
    contextId: row.context_id ?? undefined,
    type: row.type as InboxItem["type"],
    status: row.status as InboxItem["status"],
    relatedEntityType: (row.related_entity_type ??
      "payment_action") as InboxItem["relatedEntityType"],
    relatedEntityId: row.related_entity_id ?? "",
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

async function selectAll<T extends keyof Tables & string>(
  client: AppSupabaseClient,
  table: T,
): Promise<Tables[T]["Row"][]> {
  const { data, error } = await client.from(table).select("*");
  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }
  // supabase-js cannot express "all columns of a generic table" — the result
  // is cast back to the generated row type of the requested table.
  return (data ?? []) as unknown as Tables[T]["Row"][];
}

async function loadRemoteData(client: AppSupabaseClient): Promise<void> {
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

// Snapshot of the ledger data for derived views (person balance overview).
// Triggers the lazy load and returns undefined while it is still pending.
export interface SupabaseLedgerSnapshot {
  expenses: Expense[];
  expenseShares: ExpenseShare[];
  paymentActions: PaymentAction[];
  groups: Group[];
}

export function getSupabaseLedgerData(): SupabaseLedgerSnapshot | undefined {
  const data = ensureLoaded();
  if (!data) {
    return undefined;
  }
  return {
    expenses: data.expenses,
    expenseShares: data.shares,
    paymentActions: data.actions,
    groups: data.groups,
  };
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

function buildSupabaseRecordSetup(data: RemoteData): RecordSetupData | undefined {
  if (!currentUserId) {
    return undefined;
  }
  const group = data.groups[0];
  const context = data.contexts.find((candidate) => candidate.groupId === group?.id);
  if (!group || !context) {
    return undefined;
  }
  const memberIds = data.members
    .filter((member) => member.groupId === group.id && !member.leftAt)
    .map((member) => member.userId);
  if (memberIds.length === 0) {
    return undefined;
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    groupId: group.id,
    contextId: context.id,
    contextLabel: `${group.name} · ${context.name} · supabase-local`,
    expenseDate: today,
    currency: group.defaultCurrency,
    payerOptions: memberIds.map((userId) => ({
      userId,
      name: getUserName(data, userId),
    })),
    defaultPayerUserId: memberIds.includes(currentUserId) ? currentUserId : memberIds[0],
    participants: memberIds.map((userId) => ({
      userId,
      name: getUserName(data, userId),
      paused: false,
      defaultSelected: true,
    })),
  };
}

async function withSession(
  run: (client: AppSupabaseClient, userId: string) => Promise<WriteResult>,
): Promise<WriteResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Kein Supabase-Client konfiguriert (siehe .env.example)." };
  }
  if (!currentUserId) {
    return { ok: false, message: "Keine lokale Dev-Session aktiv (Profil-Tab)." };
  }
  return run(client, currentUserId);
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
  getRecordSetup: () => {
    const data = ensureLoaded();
    const setup = data ? buildSupabaseRecordSetup(data) : undefined;
    return setup ?? mockRepositories.getRecordSetup();
  },
  createGroup: (input) =>
    withSession(async (client, userId) => {
      const result = await createGroupWithDefaults(client, userId, input);
      if (result.ok) {
        reloadSupabaseData();
      }
      return result;
    }),
  createExpense: (input) =>
    withSession(async (client, userId) => {
      const result = await createExpenseWithShares(client, userId, input);
      if (result.ok) {
        reloadSupabaseData();
      }
      return result;
    }),
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
