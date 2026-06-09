import assert from "node:assert/strict";
import test from "node:test";

import * as core from "./index";

import type {
  ContextMember,
  EntityId,
  MemberAvailability,
} from "./domain-types";

const groupId = "group-1";
const tripContextId = "context-trip";
const otherContextId = "context-other";
const createdBy = "user-admin";
const createdAt = "2026-06-09T10:00:00.000Z";

function buildContextMember(userId: EntityId, contextId = tripContextId): ContextMember {
  return {
    id: `context-member-${contextId}-${userId}`,
    contextId,
    userId,
    defaultIncluded: true,
    joinedAt: createdAt,
  };
}

function buildAvailability(
  overrides: Partial<MemberAvailability> &
    Pick<MemberAvailability, "id" | "userId" | "unavailableFrom" | "mode">,
): MemberAvailability {
  return {
    groupId,
    affectsDefaultSelection: true,
    createdBy,
    createdAt,
    ...overrides,
  };
}

test("core package exports participant selection functions", () => {
  assert.equal(typeof core, "object");
  assert.equal(typeof core.getPausedParticipantsForDate, "function");
  assert.equal(typeof core.getActiveParticipantsForDate, "function");
  assert.equal(typeof core.buildDefaultExpenseParticipantSelection, "function");
});

test("all context members are active when no pause exists", () => {
  const contextMembers = [
    buildContextMember("user-a"),
    buildContextMember("user-b"),
    buildContextMember("user-c"),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities: [],
    }),
    ["user-a", "user-b", "user-c"],
  );
});

test("context-specific paused participant is excluded on affected date", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  const selection = core.buildDefaultExpenseParticipantSelection({
    contextId: tripContextId,
    expenseDate: "2026-06-09",
    contextMembers,
    memberAvailabilities,
  });

  assert.deepEqual(selection.defaultSelectedParticipantUserIds, ["user-a"]);
  assert.deepEqual(selection.pausedParticipantUserIds, ["user-b"]);
});

test("context-specific paused participant is active before the pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-07",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("context-specific paused participant is active again after the pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-11",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("indefinite pause excludes from the start date onward", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getPausedParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-07-01",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-b"],
  );
});

test("group-wide pause excludes participant in the activity when no context override exists", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      userId: "user-b",
      unavailableFrom: "2026-06-08",
      unavailableUntil: "2026-06-10",
      mode: "paused",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a"],
  );
});

test("context-specific available override wins over group-wide pause", () => {
  const contextMembers = [buildContextMember("user-a"), buildContextMember("user-b")];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-group",
      userId: "user-b",
      unavailableFrom: "2026-06-01",
      mode: "paused",
    }),
    buildAvailability({
      id: "availability-context",
      contextId: tripContextId,
      userId: "user-b",
      unavailableFrom: "2026-06-01",
      mode: "available",
    }),
  ];

  assert.deepEqual(
    core.getActiveParticipantsForDate({
      contextId: tripContextId,
      expenseDate: "2026-06-09",
      contextMembers,
      memberAvailabilities,
    }),
    ["user-a", "user-b"],
  );
});

test("paused participants remain manually selectable through the selection result", () => {
  const contextMembers = [
    buildContextMember("user-a"),
    buildContextMember("user-b"),
    buildContextMember("user-c"),
    buildContextMember("user-z", otherContextId),
  ];
  const memberAvailabilities = [
    buildAvailability({
      id: "availability-1",
      contextId: tripContextId,
      userId: "user-c",
      unavailableFrom: "2026-06-08",
      mode: "paused",
    }),
  ];

  const selection = core.buildDefaultExpenseParticipantSelection({
    contextId: tripContextId,
    expenseDate: "2026-06-09",
    contextMembers,
    memberAvailabilities,
  });

  assert.deepEqual(selection.defaultSelectedParticipantUserIds, ["user-a", "user-b"]);
  assert.deepEqual(selection.pausedParticipantUserIds, ["user-c"]);
  assert.deepEqual(selection.manuallySelectableParticipantUserIds, [
    "user-a",
    "user-b",
    "user-c",
  ]);
});
