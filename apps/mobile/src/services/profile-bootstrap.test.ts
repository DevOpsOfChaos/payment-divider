import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ensureOwnProfile,
  validateProfileInput,
  type ProfileBootstrapClient,
} from "./profile-bootstrap";

interface FakeState {
  existingIds: string[];
  selectError?: string;
  insertError?: string;
  inserted: Array<{ id: string; display_name: string; username: string | null }>;
}

function fakeClient(state: FakeState): ProfileBootstrapClient {
  return {
    from() {
      return {
        select() {
          return {
            eq(_column: "id", value: string) {
              return {
                async maybeSingle() {
                  if (state.selectError) {
                    return { data: null, error: { message: state.selectError } };
                  }
                  return {
                    data: state.existingIds.includes(value) ? { id: value } : null,
                    error: null,
                  };
                },
              };
            },
          };
        },
        async insert(row: { id: string; display_name: string; username: string | null }) {
          if (state.insertError) {
            return { error: { message: state.insertError } };
          }
          state.inserted.push(row);
          return { error: null };
        },
      };
    },
  };
}

describe("validateProfileInput", () => {
  it("rejects blank display names", () => {
    assert.equal(
      validateProfileInput({ displayName: "   " })?.key,
      "service.profile.displayNameEmpty",
    );
  });

  it("rejects blank usernames but allows omitted ones", () => {
    assert.equal(
      validateProfileInput({ displayName: "A", username: "  " })?.key,
      "service.profile.usernameEmpty",
    );
    assert.equal(validateProfileInput({ displayName: "A" }), undefined);
    assert.equal(validateProfileInput({ displayName: "A", username: "a" }), undefined);
  });
});

describe("ensureOwnProfile", () => {
  it("creates the row with trimmed user data when none exists", async () => {
    const state: FakeState = { existingIds: [], inserted: [] };
    const result = await ensureOwnProfile(fakeClient(state), "user-1", {
      displayName: "  Ada  ",
      username: " ada ",
    });
    assert.deepEqual(result, { ok: true, created: true });
    assert.deepEqual(state.inserted, [
      { id: "user-1", display_name: "Ada", username: "ada" },
    ]);
  });

  it("stores null when no username is chosen", async () => {
    const state: FakeState = { existingIds: [], inserted: [] };
    await ensureOwnProfile(fakeClient(state), "user-1", { displayName: "Ada" });
    assert.equal(state.inserted[0]?.username, null);
  });

  it("never overwrites an existing profile", async () => {
    const state: FakeState = { existingIds: ["user-1"], inserted: [] };
    const result = await ensureOwnProfile(fakeClient(state), "user-1", {
      displayName: "Other Name",
    });
    assert.deepEqual(result, { ok: true, created: false });
    assert.equal(state.inserted.length, 0);
  });

  it("fails closed on invalid input without touching the database", async () => {
    const state: FakeState = { existingIds: [], inserted: [] };
    const result = await ensureOwnProfile(fakeClient(state), "user-1", { displayName: " " });
    assert.equal(result.ok, false);
    assert.equal(state.inserted.length, 0);
  });

  it("surfaces select and insert errors as keys with detail", async () => {
    const selectFail = await ensureOwnProfile(
      fakeClient({ existingIds: [], inserted: [], selectError: "boom" }),
      "user-1",
      { displayName: "Ada" },
    );
    assert.equal(selectFail.ok, false);
    assert.equal(selectFail.message?.key, "service.profile.checkFailed");
    assert.equal(selectFail.message?.params?.detail, "boom");

    const insertFail = await ensureOwnProfile(
      fakeClient({ existingIds: [], inserted: [], insertError: "denied" }),
      "user-1",
      { displayName: "Ada" },
    );
    assert.equal(insertFail.ok, false);
    assert.equal(insertFail.message?.key, "service.profile.createFailed");
    assert.equal(insertFail.message?.params?.detail, "denied");
  });
});
