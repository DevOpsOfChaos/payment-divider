import type {
  CurrencyCode,
  EntityId,
  ISODateString,
  PaymentAction,
} from "@payment-divider/core";

import type { ActivityDetailScreenMock } from "../mock-data/activity-detail";
import type { GroupDetailScreenMock } from "../mock-data/group-detail";
import type { GroupCardMock } from "../mock-data/groups";
import type { InboxScreenMock } from "../mock-data/inbox";
import type {
  OverviewActionMock,
  OverviewActivityMock,
  OverviewAttentionMock,
  OverviewBalanceMock,
  OverviewBalanceRowMock,
} from "../mock-data/overview";
import type { ProfileScreenMock } from "../mock-data/profile";

export interface OverviewData {
  balance: OverviewBalanceMock;
  receivables: OverviewBalanceRowMock[];
  debts: OverviewBalanceRowMock[];
  openActions: OverviewActionMock[];
  recentActivity: OverviewActivityMock[];
  groupAttention: OverviewAttentionMock[];
}

export interface RecordPersonOption {
  userId: EntityId;
  name: string;
}

export interface RecordParticipantOption extends RecordPersonOption {
  paused: boolean;
  pausedDetail?: string;
  defaultSelected: boolean;
}

export interface RecordSetupData {
  groupId: EntityId;
  contextId: EntityId;
  contextLabel: string;
  expenseDate: ISODateString;
  currency: CurrencyCode;
  payerOptions: RecordPersonOption[];
  defaultPayerUserId: EntityId;
  participants: RecordParticipantOption[];
}

export interface OverviewRepository {
  getOverview(): OverviewData;
}

export interface GroupsRepository {
  getGroups(): GroupCardMock[];
}

export interface GroupDetailRepository {
  getGroupDetail(): GroupDetailScreenMock;
}

export interface ActivityDetailRepository {
  getActivityDetail(): ActivityDetailScreenMock;
}

export interface RecordRepository {
  getRecordSetup(): RecordSetupData;
}

export type SettlementRole = "payer" | "payee";
export type SettlementActionKind = "mark_paid" | "confirm" | "reject";

export interface SettlementItemData {
  action: PaymentAction;
  counterpartyName: string;
  source: string;
  role: SettlementRole;
  statusLabel: string;
  availableActions: SettlementActionKind[];
}

export interface InboxRepository {
  getInbox(): InboxScreenMock;
  getSettlementItems(): SettlementItemData[];
}

export interface ProfileRepository {
  getProfile(): ProfileScreenMock;
}

export interface AppRepositories
  extends OverviewRepository,
    GroupsRepository,
    GroupDetailRepository,
    ActivityDetailRepository,
    RecordRepository,
    InboxRepository,
    ProfileRepository {}
