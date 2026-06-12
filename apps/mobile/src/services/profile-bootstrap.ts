import { msg, type ServiceMessage } from "../i18n/service-message";
import type { AppSupabaseClient } from "./supabase-client";

// Profile bootstrap after sign-in (#135): make sure a profiles row exists for
// the authenticated user, with only user-chosen minimal data (display name,
// optional username). Never touches contact data; no phone number anywhere.
//
// Kept free of runtime react-native imports (the supabase-client import above
// is type-only and erased; service-message is pure) so it can run under
// node:test with a faked client and in the auth-flow smoke script against the
// local stack. Messages are stable keys (#142); the UI translates.

export interface ProfileInput {
  displayName: string;
  username?: string;
}

interface ProfileRow {
  id: string;
  display_name: string;
  username: string | null;
}

interface QueryError {
  message: string;
}

export interface ProfileBootstrapClient {
  from(table: "profiles"): {
    select(columns: "id"): {
      eq(
        column: "id",
        value: string,
      ): {
        maybeSingle(): Promise<{ data: { id: string } | null; error: QueryError | null }>;
      };
    };
    insert(row: ProfileRow): Promise<{ error: QueryError | null }>;
  };
}

// Thin adapter onto the narrow bootstrap interface: the supabase-js builder
// types are thenables, not Promises, and comparing them structurally against
// the test-friendly ProfileBootstrapClient blows up type instantiation.
export function asBootstrapClient(client: AppSupabaseClient): ProfileBootstrapClient {
  return {
    from() {
      return {
        select() {
          return {
            eq(_column, value) {
              return {
                async maybeSingle() {
                  const { data, error } = await client
                    .from("profiles")
                    .select("id")
                    .eq("id", value)
                    .maybeSingle();
                  return { data, error };
                },
              };
            },
          };
        },
        async insert(row) {
          const { error } = await client.from("profiles").insert(row);
          return { error };
        },
      };
    },
  };
}

export interface ProfileBootstrapResult {
  ok: boolean;
  created: boolean;
  message?: ServiceMessage;
}

export function validateProfileInput(input: ProfileInput): ServiceMessage | undefined {
  if (input.displayName.trim().length === 0) {
    return msg("service.profile.displayNameEmpty");
  }
  if (input.username !== undefined && input.username.trim().length === 0) {
    return msg("service.profile.usernameEmpty");
  }
  return undefined;
}

// Creates the self profiles row if it does not exist yet. RLS allows exactly
// this: profiles_insert_own permits inserting the row whose id is auth.uid().
// Existing profiles are left untouched — sign-in never overwrites user data.
export async function ensureOwnProfile(
  client: ProfileBootstrapClient,
  userId: string,
  input: ProfileInput,
): Promise<ProfileBootstrapResult> {
  const invalid = validateProfileInput(input);
  if (invalid) {
    return { ok: false, created: false, message: invalid };
  }

  const existing = await client.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing.error) {
    return {
      ok: false,
      created: false,
      message: msg("service.profile.checkFailed", { detail: existing.error.message }),
    };
  }
  if (existing.data) {
    return { ok: true, created: false };
  }

  const { error } = await client.from("profiles").insert({
    id: userId,
    display_name: input.displayName.trim(),
    username: input.username?.trim() ?? null,
  });
  if (error) {
    return {
      ok: false,
      created: false,
      message: msg("service.profile.createFailed", { detail: error.message }),
    };
  }
  return { ok: true, created: true };
}
