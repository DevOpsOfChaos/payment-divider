import type {
  ContextMember,
  EntityId,
  ISODateString,
  MemberAvailability,
} from "./domain-types";

export interface ParticipantSelectionInput {
  contextId: EntityId;
  expenseDate: ISODateString;
  contextMembers: ContextMember[];
  memberAvailabilities: MemberAvailability[];
}

export interface ParticipantSelectionResult {
  defaultSelectedParticipantUserIds: EntityId[];
  activeParticipantUserIds: EntityId[];
  pausedParticipantUserIds: EntityId[];
  manuallySelectableParticipantUserIds: EntityId[];
}

function compareIsoDates(left: ISODateString, right: ISODateString): number {
  return left.localeCompare(right);
}

function isDateWithinAvailability(
  expenseDate: ISODateString,
  availability: MemberAvailability,
): boolean {
  if (compareIsoDates(expenseDate, availability.unavailableFrom) < 0) {
    return false;
  }

  if (!availability.unavailableUntil) {
    return true;
  }

  return compareIsoDates(expenseDate, availability.unavailableUntil) <= 0;
}

function compareAvailabilityPriority(
  left: MemberAvailability,
  right: MemberAvailability,
): number {
  const byStartDate = compareIsoDates(right.unavailableFrom, left.unavailableFrom);
  if (byStartDate !== 0) {
    return byStartDate;
  }

  const byCreatedAt = right.createdAt.localeCompare(left.createdAt);
  if (byCreatedAt !== 0) {
    return byCreatedAt;
  }

  return right.id.localeCompare(left.id);
}

function getRelevantAvailabilitiesForDate(
  memberAvailabilities: MemberAvailability[],
  userId: EntityId,
  expenseDate: ISODateString,
): MemberAvailability[] {
  return memberAvailabilities.filter(
    (availability) =>
      availability.userId === userId &&
      availability.affectsDefaultSelection &&
      isDateWithinAvailability(expenseDate, availability),
  );
}

function getWinningAvailabilityForDate(
  memberAvailabilities: MemberAvailability[],
  contextId: EntityId,
  userId: EntityId,
  expenseDate: ISODateString,
): MemberAvailability | undefined {
  const relevantAvailabilities = getRelevantAvailabilitiesForDate(
    memberAvailabilities,
    userId,
    expenseDate,
  );

  const contextSpecificAvailabilities = relevantAvailabilities
    .filter((availability) => availability.contextId === contextId)
    .sort(compareAvailabilityPriority);

  if (contextSpecificAvailabilities.length > 0) {
    return contextSpecificAvailabilities[0];
  }

  return relevantAvailabilities
    .filter((availability) => availability.contextId === undefined)
    .sort(compareAvailabilityPriority)[0];
}

function getContextUserIds(
  contextMembers: ContextMember[],
  contextId: EntityId,
): EntityId[] {
  return contextMembers
    .filter((contextMember) => contextMember.contextId === contextId)
    .map((contextMember) => contextMember.userId)
    .sort((left, right) => left.localeCompare(right));
}

export function getPausedParticipantsForDate(
  input: ParticipantSelectionInput,
): EntityId[] {
  return getContextUserIds(input.contextMembers, input.contextId).filter((userId) => {
    const winningAvailability = getWinningAvailabilityForDate(
      input.memberAvailabilities,
      input.contextId,
      userId,
      input.expenseDate,
    );

    return winningAvailability?.mode === "paused";
  });
}

export function getActiveParticipantsForDate(
  input: ParticipantSelectionInput,
): EntityId[] {
  const pausedParticipantUserIds = new Set(getPausedParticipantsForDate(input));

  return getContextUserIds(input.contextMembers, input.contextId).filter(
    (userId) => !pausedParticipantUserIds.has(userId),
  );
}

export function buildDefaultExpenseParticipantSelection(
  input: ParticipantSelectionInput,
): ParticipantSelectionResult {
  const activeParticipantUserIds = getActiveParticipantsForDate(input);
  const pausedParticipantUserIds = getPausedParticipantsForDate(input);
  const manuallySelectableParticipantUserIds = getContextUserIds(
    input.contextMembers,
    input.contextId,
  );

  return {
    defaultSelectedParticipantUserIds: activeParticipantUserIds,
    activeParticipantUserIds,
    pausedParticipantUserIds,
    manuallySelectableParticipantUserIds,
  };
}
