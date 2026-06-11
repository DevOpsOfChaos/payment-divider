import { buildDefaultExpenseParticipantSelection } from "@payment-divider/core";

import { ACTIVITY_DETAIL_SCREEN_MOCK } from "../mock-data/activity-detail";
import { GROUP_DETAIL_SCREEN_MOCK } from "../mock-data/group-detail";
import { GROUPS_MOCK } from "../mock-data/groups";
import { INBOX_SCREEN_MOCK } from "../mock-data/inbox";
import {
  DEBTS_MOCK,
  GROUP_ATTENTION_MOCK,
  OPEN_ACTIONS_MOCK,
  OVERVIEW_BALANCE_MOCK,
  RECEIVABLES_MOCK,
  RECENT_ACTIVITY_MOCK,
} from "../mock-data/overview";
import { PROFILE_SCREEN_MOCK } from "../mock-data/profile";
import {
  MOCK_CONTEXT_IDS,
  MOCK_CONTEXT_MEMBERS,
  MOCK_CURRENT_USER_ID,
  MOCK_MEMBER_AVAILABILITY,
  MOCK_USERS,
} from "../mock-data/ledger";
import type { AppRepositories, RecordSetupData } from "./repositories";

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

export const mockRepositories: AppRepositories = {
  getOverview: () => ({
    balance: OVERVIEW_BALANCE_MOCK,
    receivables: RECEIVABLES_MOCK,
    debts: DEBTS_MOCK,
    openActions: OPEN_ACTIONS_MOCK,
    recentActivity: RECENT_ACTIVITY_MOCK,
    groupAttention: GROUP_ATTENTION_MOCK,
  }),
  getGroups: () => GROUPS_MOCK,
  getGroupDetail: () => GROUP_DETAIL_SCREEN_MOCK,
  getActivityDetail: () => ACTIVITY_DETAIL_SCREEN_MOCK,
  getRecordSetup: buildRecordSetup,
  getInbox: () => INBOX_SCREEN_MOCK,
  getProfile: () => PROFILE_SCREEN_MOCK,
};
