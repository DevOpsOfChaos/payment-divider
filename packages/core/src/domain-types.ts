export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type CurrencyCode = string;

export interface User {
  id: EntityId;
  displayName: string;
  username: string;
  email: string;
  phone?: string;
  createdAt: ISODateTimeString;
  deletedAt?: ISODateTimeString;
}

export type FriendConnectionStatus = "pending" | "accepted" | "declined" | "blocked";

export interface FriendConnection {
  id: EntityId;
  requesterUserId: EntityId;
  addresseeUserId: EntityId;
  status: FriendConnectionStatus;
  createdAt: ISODateTimeString;
  acceptedAt?: ISODateTimeString;
}

export type GroupType = "friends" | "trip" | "shared_flat" | "couple" | "family" | "event" | "custom";

export interface Group {
  id: EntityId;
  name: string;
  type: GroupType;
  defaultCurrency: CurrencyCode;
  createdBy: EntityId;
  createdAt: ISODateTimeString;
  archivedAt?: ISODateTimeString;
}

export type GroupMemberRole = "owner" | "admin" | "member";

export interface GroupMember {
  id: EntityId;
  groupId: EntityId;
  userId: EntityId;
  role: GroupMemberRole;
  joinedAt: ISODateTimeString;
  leftAt?: ISODateTimeString;
  visibilityProfileId?: EntityId;
}

export type GroupContextType = "general" | "trip" | "event" | "household" | "purchase" | "custom";

export interface GroupContext {
  id: EntityId;
  groupId: EntityId;
  name: string;
  type: GroupContextType;
  startDate?: ISODateString;
  endDate?: ISODateString;
  defaultCurrency?: CurrencyCode;
  archivedAt?: ISODateTimeString;
}

export type Activity = GroupContext;

export interface ContextMember {
  id: EntityId;
  contextId: EntityId;
  userId: EntityId;
  defaultIncluded: boolean;
  joinedAt: ISODateTimeString;
}

export type MemberAvailabilityMode = "paused" | "available";

/**
 * Controls default participant selection only.
 * It must not remove membership or rewrite historical balances.
 */
export interface MemberAvailability {
  id: EntityId;
  groupId: EntityId;
  contextId?: EntityId;
  userId: EntityId;
  unavailableFrom: ISODateString;
  unavailableUntil?: ISODateString;
  mode: MemberAvailabilityMode;
  note?: string;
  affectsDefaultSelection: boolean;
  createdBy: EntityId;
  createdAt: ISODateTimeString;
}

export interface Expense {
  id: EntityId;
  groupId: EntityId;
  contextId: EntityId;
  amount: number;
  currency: CurrencyCode;
  paidByUserId: EntityId;
  date: ISODateString;
  title?: string;
  note?: string;
  createdBy: EntityId;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  deletedAt?: ISODateTimeString;
}

export type ExpenseShareType = "equal" | "fixed";

export interface ExpenseShare {
  id: EntityId;
  expenseId: EntityId;
  userId: EntityId;
  shareType: ExpenseShareType;
  amount: number;
  currency: CurrencyCode;
}

export type PaymentActionStatus =
  | "suggested"
  | "marked_paid"
  | "confirmed"
  | "rejected";

/**
 * Ledger state only.
 * This records what users marked or confirmed outside the app and must never imply payment execution.
 */
export interface PaymentAction {
  id: EntityId;
  groupId: EntityId;
  contextId?: EntityId;
  payerId: EntityId;
  payeeId: EntityId;
  amount: number;
  currency: CurrencyCode;
  status: PaymentActionStatus;
  paymentMethodId?: EntityId;
  createdAt: ISODateTimeString;
  markedPaidAt?: ISODateTimeString;
  confirmedByPayeeAt?: ISODateTimeString;
  rejectedAt?: ISODateTimeString;
}

export type TimelineEventType =
  | "expense_created"
  | "expense_updated"
  | "payment_marked"
  | "payment_confirmed"
  | "member_joined"
  | "member_availability_changed";

export type TimelineEntityType =
  | "expense"
  | "payment_action"
  | "group_member"
  | "member_availability"
  | "group_context";

export interface TimelineEvent {
  id: EntityId;
  groupId: EntityId;
  contextId?: EntityId;
  actorUserId: EntityId;
  eventType: TimelineEventType;
  entityType: TimelineEntityType;
  entityId: EntityId;
  createdAt: ISODateTimeString;
}

export type InboxItemType =
  | "confirm_payment"
  | "accept_invitation"
  | "choose_visibility_profile"
  | "resolve_sync_conflict"
  | "review_payment_method_sharing";

export type InboxItemStatus = "open" | "resolved" | "dismissed";

export type InboxRelatedEntityType =
  | "friend_connection"
  | "group_member"
  | "payment_action"
  | "member_availability";

export interface InboxItem {
  id: EntityId;
  userId: EntityId;
  groupId?: EntityId;
  contextId?: EntityId;
  type: InboxItemType;
  status: InboxItemStatus;
  relatedEntityType: InboxRelatedEntityType;
  relatedEntityId: EntityId;
  createdAt: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
}
