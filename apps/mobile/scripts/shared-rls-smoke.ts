// Client-side shared-project RLS smoke (Path B, issue #139).
//
// Three disposable accounts (Alice/owner, Bob/participant, Mallory/outsider)
// exercise allowed AND forbidden PostgREST paths for every case in the
// shared-alpha runbook table (docs/development/shared-alpha-supabase.md §5).
//
// Run against the local stack (stack must be running, autoconfirm required):
//   $env:SUPABASE_URL = "http://127.0.0.1:54321"
//   $env:SUPABASE_PUBLIC_KEY = "<anon key from supabase status>"
//   corepack pnpm db:shared-rls-smoke
//
// Run against a shared-alpha project (autoconfirm must be enabled in Auth settings):
//   $env:SUPABASE_URL = "<shared project URL>"
//   $env:SUPABASE_PUBLIC_KEY = "<publishable/anon key>"
//   corepack pnpm db:shared-rls-smoke
//
// Cleanup: each run creates three smoke accounts (pd-rls-smoke-*) plus data
// rows. This script has no server-side rollback and no service role key.
//   Local stack: `supabase db reset` clears everything.
//   Shared project: maintainer deletes smoke accounts manually via
//     dashboard → Auth → Users (filter by "pd-rls-smoke-").
//
// Not client-testable in this script:
//   - payment_actions status transitions (no direct insert path exercised here)
//   - claim_payments immutability (requires creator insert first; omitted to
//     keep the script self-contained — covered by the SQL suite)
//   - exact trigger error messages (checked as error present/absent only)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import type { Database } from "../src/services/database.types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLIC_KEY;
if (!url || !key) {
  console.error(
    "Missing env vars: SUPABASE_URL and SUPABASE_PUBLIC_KEY must be set.\n" +
      "  Local:        values printed by `supabase status`\n" +
      "  Shared-alpha: values from the Supabase dashboard (no service role key needed)",
  );
  process.exit(1);
}

function makeClient(): SupabaseClient<Database> {
  return createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

let passes = 0;
let failures = 0;

function ok(label: string) {
  console.log(`PASS  ${label}`);
  passes++;
}

function notOk(label: string, detail?: string) {
  console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  failures++;
}

type AnyResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

async function assertAllowed(label: string, fn: () => Promise<AnyResult>) {
  const r = await fn();
  r.error ? notOk(label, r.error.message) : ok(label);
}

// For forbidden checks: pass when error is present (RLS insert rejection,
// trigger exception) OR when data is an empty array (RLS update/select block).
async function assertForbidden(label: string, fn: () => Promise<AnyResult>) {
  const r = await fn();
  const blocked =
    r.error !== null ||
    (Array.isArray(r.data) && r.data.length === 0);
  blocked ? ok(label) : notOk(label, `expected forbidden; got ${JSON.stringify(r.data)}`);
}

async function assertRowCount(
  label: string,
  expected: number,
  fn: () => Promise<{ data: unknown[] | null; error: { message: string } | null }>,
) {
  const r = await fn();
  if (r.error) {
    notOk(label, r.error.message);
    return;
  }
  const n = r.data?.length ?? 0;
  n === expected ? ok(label) : notOk(label, `expected ${expected} row(s), got ${n}`);
}

async function signUpActor(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<string> {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session?.user.id) {
    console.error(
      `Sign-up failed for ${email}: ${error?.message ?? "no session returned"}.\n` +
        "  Email confirmation must be disabled (autoconfirm on) to run this smoke.\n" +
        "  Local: autoconfirm is on by default.\n" +
        "  Shared-alpha: disable email confirmation in Auth → Settings in the dashboard.",
    );
    process.exit(1);
  }
  return data.session.user.id;
}

async function main() {
  const ts = Date.now();
  const pw = `smoke-${randomUUID()}`;

  // Three separate clients — each actor has an independent session.
  const aliceClient = makeClient();
  const bobClient = makeClient();
  const malloryClient = makeClient();

  // ---------------------------------------------------------------- setup ---

  console.log("=== Setup ===");
  const aliceEmail = `pd-rls-smoke-alice-${ts}@smoke.test`;
  const bobEmail = `pd-rls-smoke-bob-${ts}@smoke.test`;
  const malloryEmail = `pd-rls-smoke-mallory-${ts}@smoke.test`;

  const aliceId = await signUpActor(aliceClient, aliceEmail, pw);
  const bobId = await signUpActor(bobClient, bobEmail, pw);
  const malloryId = await signUpActor(malloryClient, malloryEmail, pw);
  console.log(
    `Alice:   ${aliceId.slice(0, 8)}`,
    `\nBob:     ${bobId.slice(0, 8)}`,
    `\nMallory: ${malloryId.slice(0, 8)}`,
  );

  // Create profiles for all three actors.
  await assertAllowed("Alice creates own profile", () =>
    aliceClient
      .from("profiles")
      .insert({ id: aliceId, display_name: "Smoke Alice", username: `smoke-alice-${ts}` }),
  );
  await assertAllowed("Bob creates own profile", () =>
    bobClient
      .from("profiles")
      .insert({ id: bobId, display_name: "Smoke Bob", username: `smoke-bob-${ts}` }),
  );
  await assertAllowed("Mallory creates own profile", () =>
    malloryClient
      .from("profiles")
      .insert({ id: malloryId, display_name: "Smoke Mallory", username: `smoke-mallory-${ts}` }),
  );

  // Alice creates a group, adds herself as owner, adds Bob as member,
  // and creates a group context (needed for expense inserts).
  const groupId = randomUUID();
  const contextId = randomUUID();
  await assertAllowed("Alice creates group", () =>
    aliceClient.from("groups").insert({
      id: groupId,
      name: `Smoke Group ${ts}`,
      type: "friends",
      default_currency_code: "EUR",
      created_by: aliceId,
    }),
  );
  await assertAllowed("Alice adds herself as group owner", () =>
    aliceClient
      .from("group_members")
      .insert({ group_id: groupId, user_id: aliceId, role: "owner" }),
  );
  await assertAllowed("Alice adds Bob as group member", () =>
    aliceClient
      .from("group_members")
      .insert({ group_id: groupId, user_id: bobId, role: "member" }),
  );
  await assertAllowed("Alice creates group context", () =>
    aliceClient
      .from("group_contexts")
      .insert({ id: contextId, group_id: groupId, name: "General", type: "general" }),
  );

  // -------------------------------------------- 1. profile visibility ---

  console.log("\n=== 1. Profile visibility ===");

  await assertRowCount("Bob sees Alice's profile (shared group)", 1, () =>
    bobClient.from("profiles").select("id").eq("id", aliceId),
  );

  await assertRowCount("Mallory cannot see Alice's profile (no shared group)", 0, () =>
    malloryClient.from("profiles").select("id").eq("id", aliceId),
  );

  // RLS: profiles_insert_own — id must equal auth.uid().
  await assertForbidden("Alice cannot insert a profile for a foreign user id", () =>
    aliceClient
      .from("profiles")
      .insert({ id: randomUUID(), display_name: "Intruder", username: `intruder-${ts}` }),
  );

  // ---------------------------------------- 2. counterparties (owner-private) ---

  console.log("\n=== 2. Counterparties (owner-private) ===");

  const extCpId = randomUUID();
  const linkedCpId = randomUUID();

  await assertAllowed("Alice creates external counterparty", () =>
    aliceClient.from("counterparties").insert({
      id: extCpId,
      owner_user_id: aliceId,
      kind: "external_person",
      display_name: "External Karl",
      normalized_name: "external karl",
    }),
  );

  await assertAllowed("Alice creates app_user counterparty linked to Bob", () =>
    aliceClient.from("counterparties").insert({
      id: linkedCpId,
      owner_user_id: aliceId,
      kind: "app_user",
      display_name: "Smoke Bob",
      normalized_name: "smoke bob",
      linked_user_id: bobId,
    }),
  );

  // Counterparty records are owner-private; Bob cannot see Alice's even though
  // linked_user_id = bobId (only explicitly shared claims are visible, not the record).
  await assertRowCount("Bob cannot see Alice's counterparties (owner-private)", 0, () =>
    bobClient.from("counterparties").select("id"),
  );
  await assertRowCount("Mallory cannot see Alice's counterparties", 0, () =>
    malloryClient.from("counterparties").select("id"),
  );

  // ------------------------------------------------------- 3. claims ---

  console.log("\n=== 3. Claims ===");

  const privateClaim = randomUUID();
  const sharedClaim = randomUUID();
  const unsharedLinkedClaim = randomUUID();

  await assertAllowed("Alice creates private claim (unshared, external counterparty)", () =>
    aliceClient.from("claims").insert({
      id: privateClaim,
      creator_user_id: aliceId,
      direction: "owed_to_me",
      counterparty_id: extCpId,
      shared_with_counterparty: false,
      amount_minor: 700,
      currency_code: "EUR",
      claim_date: "2026-06-14",
      status: "private_open",
    }),
  );

  await assertAllowed("Alice creates shared claim (linked to Bob, shared_with_counterparty=true)", () =>
    aliceClient.from("claims").insert({
      id: sharedClaim,
      creator_user_id: aliceId,
      direction: "owed_to_me",
      counterparty_id: linkedCpId,
      shared_with_counterparty: true,
      amount_minor: 2000,
      currency_code: "EUR",
      claim_date: "2026-06-14",
      status: "linked_open",
    }),
  );

  // Same linked counterparty but NOT shared — privacy gate: linking never
  // exposes existing claims automatically.
  await assertAllowed("Alice creates unshared claim against linked counterparty (privacy gate)", () =>
    aliceClient.from("claims").insert({
      id: unsharedLinkedClaim,
      creator_user_id: aliceId,
      direction: "owed_to_me",
      counterparty_id: linkedCpId,
      shared_with_counterparty: false,
      amount_minor: 900,
      currency_code: "EUR",
      claim_date: "2026-06-14",
      status: "private_open",
    }),
  );

  await assertRowCount("Alice sees all own claims (3)", 3, () =>
    aliceClient.from("claims").select("id"),
  );

  // Bob: linked counterparty sees only the explicitly shared claim.
  await assertRowCount("Bob sees only the shared claim (not private, not unshared linked)", 1, () =>
    bobClient.from("claims").select("id"),
  );

  // Outsider sees nothing.
  await assertRowCount("Mallory sees no claims", 0, () =>
    malloryClient.from("claims").select("id"),
  );

  // Bob may dispute the shared claim (status-only update).
  await assertAllowed("Bob disputes the shared claim (linked_open -> disputed, allowed)", () =>
    bobClient.from("claims").update({ status: "disputed" }).eq("id", sharedClaim).select(),
  );

  // Trigger: counterparty may only change status, not core fields.
  await assertForbidden("Bob cannot change claim amount (trigger pins core fields)", () =>
    bobClient.from("claims").update({ amount_minor: 1 }).eq("id", sharedClaim).select(),
  );

  // ----------------------------------------- 4. claim reminders (personal) ---

  console.log("\n=== 4. Claim reminders (personal) ===");

  await assertAllowed("Alice creates own reminder on shared claim", () =>
    aliceClient.from("claim_reminders").insert({
      claim_id: sharedClaim,
      user_id: aliceId,
      remind_at: "2026-07-01T09:00:00Z",
    }),
  );

  await assertAllowed("Bob creates own reminder on shared claim", () =>
    bobClient.from("claim_reminders").insert({
      claim_id: sharedClaim,
      user_id: bobId,
      remind_at: "2026-07-02T09:00:00Z",
    }),
  );

  // RLS: claim_reminders_insert_own — user_id must equal auth.uid().
  await assertForbidden("Bob cannot create a reminder in Alice's name", () =>
    bobClient.from("claim_reminders").insert({
      claim_id: sharedClaim,
      user_id: aliceId,
      remind_at: "2026-07-03T09:00:00Z",
    }),
  );

  // RLS: claim_reminders_select_own — user_id = auth.uid().
  await assertRowCount("Alice cannot see Bob's reminder", 0, () =>
    aliceClient.from("claim_reminders").select("id").eq("user_id", bobId),
  );

  // Bob may snooze (update remind_at) own reminder.
  await assertAllowed("Bob snoozes own reminder (update remind_at)", () =>
    bobClient
      .from("claim_reminders")
      .update({ remind_at: "2026-07-10T09:00:00Z" })
      .eq("claim_id", sharedClaim)
      .eq("user_id", bobId)
      .select(),
  );

  // Alice cannot update Bob's reminder (RLS gives zero rows).
  await assertForbidden("Alice cannot update Bob's reminder (RLS filters to 0 rows)", () =>
    aliceClient
      .from("claim_reminders")
      .update({ remind_at: "2099-01-01T00:00:00Z" })
      .eq("user_id", bobId)
      .select(),
  );

  // -------------------------------------------------- 5. inbox items ---

  console.log("\n=== 5. Inbox items ===");

  const aliceInboxId = randomUUID();
  const bobInboxId = randomUUID();

  await assertAllowed("Alice creates own inbox item", () =>
    aliceClient
      .from("inbox_items")
      .insert({ id: aliceInboxId, user_id: aliceId, type: "confirmation_pending" }),
  );

  await assertAllowed("Bob creates own inbox item", () =>
    bobClient
      .from("inbox_items")
      .insert({ id: bobInboxId, user_id: bobId, type: "confirmation_pending" }),
  );

  // RLS: inbox_items_insert_own — user_id must equal auth.uid().
  await assertForbidden("Bob cannot create an inbox item for Alice", () =>
    bobClient
      .from("inbox_items")
      .insert({ user_id: aliceId, type: "confirmation_pending" }),
  );

  // Owner resolves own item (trigger stamps resolved_at).
  await assertAllowed("Alice resolves own inbox item", () =>
    aliceClient
      .from("inbox_items")
      .update({ status: "resolved" })
      .eq("id", aliceInboxId)
      .select(),
  );

  // Trigger: only status column may change; other columns are pinned.
  await assertForbidden("Alice cannot change non-status column of own inbox item (trigger)", () =>
    aliceClient
      .from("inbox_items")
      .update({ type: "something_else" })
      .eq("id", aliceInboxId)
      .select(),
  );

  // RLS: inbox_items are strictly own — Bob sees Alice's item as zero rows.
  await assertForbidden("Bob cannot resolve Alice's inbox item (RLS: 0 rows)", () =>
    bobClient
      .from("inbox_items")
      .update({ status: "dismissed" })
      .eq("id", aliceInboxId)
      .select(),
  );

  // ---------------------------------------------------- 6. expenses ---

  console.log("\n=== 6. Expenses ===");

  const expenseId = randomUUID();

  // Group member (Bob) may insert an expense they authored.
  await assertAllowed("Bob inserts expense (group member, created_by self)", () =>
    bobClient.from("expenses").insert({
      id: expenseId,
      group_id: groupId,
      context_id: contextId,
      amount_minor: 3000,
      currency_code: "EUR",
      paid_by_user_id: bobId,
      expense_date: "2026-06-14",
      title: `Smoke expense ${ts}`,
      created_by: bobId,
    }),
  );

  // Non-member (Mallory) cannot insert.
  await assertForbidden("Mallory cannot insert an expense (non-member, RLS 42501)", () =>
    malloryClient.from("expenses").insert({
      group_id: groupId,
      context_id: contextId,
      amount_minor: 1000,
      currency_code: "EUR",
      paid_by_user_id: malloryId,
      expense_date: "2026-06-14",
      created_by: malloryId,
    }),
  );

  // Trigger: ledger columns are immutable; only deleted_at may be set.
  await assertForbidden("Bob cannot change expense amount (trigger pins ledger columns)", () =>
    bobClient
      .from("expenses")
      .update({ amount_minor: 1 })
      .eq("id", expenseId)
      .select(),
  );

  // Creator (Bob) may soft-delete once.
  await assertAllowed("Bob soft-deletes own expense (deleted_at, one-way)", () =>
    bobClient
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expenseId)
      .select(),
  );

  // Trigger: soft delete is one-way (cannot set deleted_at back to null).
  await assertForbidden("Bob cannot undo soft delete (trigger: one-way only)", () =>
    bobClient
      .from("expenses")
      .update({ deleted_at: null })
      .eq("id", expenseId)
      .select(),
  );

  // Non-creator (Alice) cannot soft-delete another member's expense.
  const expenseId2 = randomUUID();
  await assertAllowed("Alice inserts own expense for non-creator soft-delete test", () =>
    aliceClient.from("expenses").insert({
      id: expenseId2,
      group_id: groupId,
      context_id: contextId,
      amount_minor: 500,
      currency_code: "EUR",
      paid_by_user_id: aliceId,
      expense_date: "2026-06-14",
      title: `Smoke expense 2 ${ts}`,
      created_by: aliceId,
    }),
  );
  await assertForbidden("Bob cannot soft-delete Alice's expense (RLS: creator-only)", () =>
    bobClient
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expenseId2)
      .select(),
  );

  // -------------------------------- 7. claim status transitions (#106) ---

  console.log("\n=== 7. Claim status transitions (#106) ===");

  // sharedClaim is 'disputed' at this point (Bob disputed it in section 3).

  // Forbidden: disputed -> settled (trigger: is not allowed).
  await assertForbidden("Alice cannot move disputed claim directly to settled (trigger)", () =>
    aliceClient
      .from("claims")
      .update({ status: "settled" })
      .eq("id", sharedClaim)
      .select(),
  );

  // Forbidden: disputed -> creditor_confirmed (trigger: is not allowed).
  await assertForbidden(
    "Alice cannot move disputed claim directly to creditor_confirmed (trigger)",
    () =>
      aliceClient
        .from("claims")
        .update({ status: "creditor_confirmed" })
        .eq("id", sharedClaim)
        .select(),
  );

  // Allowed: disputed -> debtor_acknowledged (clarification path).
  await assertAllowed("Bob moves disputed claim to debtor_acknowledged (allowed transition)", () =>
    bobClient
      .from("claims")
      .update({ status: "debtor_acknowledged" })
      .eq("id", sharedClaim)
      .select(),
  );

  // Forbidden: private_open claim cannot be disputed (no counterparty view).
  await assertForbidden("Alice cannot dispute a private_open claim (trigger: no counterparty view)", () =>
    aliceClient
      .from("claims")
      .update({ status: "disputed" })
      .eq("id", privateClaim)
      .select(),
  );

  // Allowed: creator archives unshared claim (private_open -> archived).
  await assertAllowed("Alice archives unshared claim (private_open -> archived, allowed)", () =>
    aliceClient
      .from("claims")
      .update({ status: "archived" })
      .eq("id", unsharedLinkedClaim)
      .select(),
  );

  // archived is terminal.
  await assertForbidden("Alice cannot reopen archived claim (trigger: archived is terminal)", () =>
    aliceClient
      .from("claims")
      .update({ status: "linked_open" })
      .eq("id", unsharedLinkedClaim)
      .select(),
  );

  // ------------------------------------------------------- summary ---

  console.log(`\n${"─".repeat(52)}`);
  if (failures === 0) {
    console.log(`Shared RLS smoke: ${passes}/${passes} PASS — all checks passed.`);
    console.log(
      "\nNot client-tested (covered by SQL suite):\n" +
        "  - payment_actions status transitions\n" +
        "  - claim_payments immutability\n" +
        "  - exact trigger error message content",
    );
  } else {
    console.log(`Shared RLS smoke: ${failures} FAIL, ${passes} PASS.`);
  }
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
