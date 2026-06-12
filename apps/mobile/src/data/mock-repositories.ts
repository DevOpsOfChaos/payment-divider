import {
  buildDefaultExpenseParticipantSelection,
  splitExpenseEqually,
} from "@payment-divider/core";

import { buildActivityDetailMock } from "../mock-data/activity-detail";
import { buildGroupDetailMock } from "../mock-data/group-detail";
import { buildGroupsMock } from "../mock-data/groups";
import { INBOX_SCREEN_MOCK } from "../mock-data/inbox";
import {
  DEBTS_MOCK,
  GROUP_ATTENTION_MOCK,
  OPEN_ACTIONS_MOCK,
  RECEIVABLES_MOCK,
  RECENT_ACTIVITY_MOCK,
  buildOverviewBalanceMock,
} from "../mock-data/overview";
import {
  addDraftExpense,
  applyLocalPaymentActionOverrides,
  getDraftExpenses,
} from "./local-ledger";
import { PROFILE_SCREEN_MOCK } from "../mock-data/profile";
import { msg } from "../i18n/service-message";
import {
  MOCK_CONTEXT_IDS,
  MOCK_CONTEXT_MEMBERS,
  MOCK_CURRENT_USER_ID,
  MOCK_GROUP_IDS,
  MOCK_GROUPS,
  MOCK_MEMBER_AVAILABILITY,
  MOCK_PAYMENT_ACTIONS,
  MOCK_USERS,
} from "../mock-data/ledger";
import type {
  AppRepositories,
  RecordSetupData,
  SettlementActionKind,
  SettlementItemData,
} from "./repositories";

const RECORD_EXPENSE_DATE = "2026-08-02";

function getUserName(userId: string): string {
  return MOCK_USERS.find((user) => user.id === userId)?.displayName ?? userId;
}

function buildRecordSetup(): RecordSetupData {
  const selection = buildDefaultExpenseParticipantSelection({
    contextId: MOCK_CONTEXT_IDS.amsterdam,
    expenseDate: RECORD_EXPENSE_DATE,
    contextMembers: MOCK_CONTEXT_MEMBERS,
    memberAvailabilities: MOCK_MEMBER_AVAILABILITY,
  });
  const pausedUserIds = new Set(selection.pausedParticipantUserIds);
  const defaultSelectedUserIds = new Set(selection.defaultSelectedParticipantUserIds);

  return {
    groupId: MOCK_GROUP_IDS.friends,
    contextId: MOCK_CONTEXT_IDS.amsterdam,
    contextLabel: "Freundeskreis · Amsterdam 2026",
    expenseDate: RECORD_EXPENSE_DATE,
    currency: "EUR",
    payerOptions: selection.manuallySelectableParticipantUserIds.map((userId) => ({
      userId,
      name: getUserName(userId),
    })),
    defaultPayerUserId: MOCK_CURRENT_USER_ID,
    participants: selection.manuallySelectableParticipantUserIds.map((userId) => {
      const paused = pausedUserIds.has(userId);
      const pausedNote = MOCK_MEMBER_AVAILABILITY.find(
        (availability) => availability.userId === userId,
      )?.note;

      return {
        userId,
        name: getUserName(userId),
        paused,
        pausedDetail: paused ? pausedNote ?? "pausiert" : undefined,
        defaultSelected: defaultSelectedUserIds.has(userId),
      };
    }),
  };
}

function getGroupName(groupId: string): string {
  return MOCK_GROUPS.find((group) => group.id === groupId)?.name ?? groupId;
}

function buildSettlementItems(): SettlementItemData[] {
  return applyLocalPaymentActionOverrides(MOCK_PAYMENT_ACTIONS)
    .filter(
      (action) =>
        action.payerId === MOCK_CURRENT_USER_ID || action.payeeId === MOCK_CURRENT_USER_ID,
    )
    .map((action) => {
      const role = action.payerId === MOCK_CURRENT_USER_ID ? "payer" : "payee";
      const counterpartyId = role === "payer" ? action.payeeId : action.payerId;

      let statusLabel: string;
      let availableActions: SettlementActionKind[] = [];
      switch (action.status) {
        case "suggested":
          statusLabel = "Vorschlag offen";
          availableActions = role === "payer" ? ["mark_paid"] : [];
          break;
        case "marked_paid":
          statusLabel =
            role === "payee"
              ? "Bestätigung offen"
              : "als extern erledigt markiert · wartet auf Bestätigung";
          availableActions = role === "payee" ? ["confirm", "reject"] : [];
          break;
        case "confirmed":
          statusLabel = "bestätigt · nur lokal dokumentiert";
          break;
        case "rejected":
          statusLabel = "abgelehnt · Saldo wieder offen";
          break;
      }

      return {
        action,
        counterpartyName: getUserName(counterpartyId),
        source: getGroupName(action.groupId),
        role,
        statusLabel,
        availableActions,
      };
    });
}

export const mockRepositories: AppRepositories = {
  getOverview: () => ({
    balance: buildOverviewBalanceMock(getDraftExpenses().length),
    receivables: RECEIVABLES_MOCK,
    debts: DEBTS_MOCK,
    openActions: OPEN_ACTIONS_MOCK,
    recentActivity: RECENT_ACTIVITY_MOCK,
    groupAttention: GROUP_ATTENTION_MOCK,
  }),
  getGroups: buildGroupsMock,
  getGroupDetail: buildGroupDetailMock,
  getActivityDetail: buildActivityDetailMock,
  getRecordSetup: buildRecordSetup,
  getInbox: () => INBOX_SCREEN_MOCK,
  getSettlementItems: buildSettlementItems,
  createGroup: async () => ({
    ok: false,
    message: msg("service.ledger.groupOnlySupabase"),
  }),
  createExpense: async (input) => {
    const draftId = `draft-${Date.now()}-${getDraftExpenses().length}`;
    const nowIso = new Date().toISOString();
    const shares = splitExpenseEqually({
      amount: input.amountMinor,
      currency: input.currency,
      participantUserIds: input.participantUserIds,
    });

    addDraftExpense({
      expense: {
        id: draftId,
        groupId: input.groupId,
        contextId: input.contextId,
        amount: input.amountMinor,
        currency: input.currency,
        paidByUserId: input.paidByUserId,
        date: input.date,
        title: input.title ?? "Ausgabe",
        createdBy: input.paidByUserId,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      shares: shares.map((share) => ({
        id: `${draftId}-${share.userId}`,
        expenseId: draftId,
        userId: share.userId,
        shareType: "equal",
        amount: share.amount,
        currency: share.currency,
      })),
    });

    return { ok: true, message: msg("service.ledger.draftSaved") };
  },
  getProfile: () => PROFILE_SCREEN_MOCK,
};
