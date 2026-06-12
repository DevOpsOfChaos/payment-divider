// Auth-flow smoke against the LOCAL Supabase stack (#135). Exercises the real
// e-mail+password flow end to end: sign-up, profile bootstrap under RLS,
// sign-out, sign-in, idempotent bootstrap, and a forbidden cross-user profile
// insert. Local stack only — URL/key come from the environment (values
// printed by `supabase start`), nothing is hardcoded, no secrets.
//
// Run (from the repo root, stack must be running):
//   $env:SUPABASE_URL = "http://127.0.0.1:54321"
//   $env:SUPABASE_PUBLIC_KEY = "<publishable key from supabase status>"
//   corepack pnpm --filter @payment-divider/mobile exec tsx scripts/auth-flow-smoke.ts

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

import type { Database } from "../src/services/database.types";
import { asBootstrapClient, ensureOwnProfile } from "../src/services/profile-bootstrap";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLIC_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_PUBLIC_KEY must be set (local stack values).");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error(`Refusing non-local URL: ${url} — this smoke runs against the local stack only.`);
  process.exit(1);
}

const client = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function main() {
  const email = `smoke-${randomUUID().slice(0, 8)}@local.test`;
  const password = `smoke-${randomUUID()}`;

  // 1. Sign-up returns a session on the local stack (autoconfirm).
  const signUp = await client.auth.signUp({ email, password });
  check("sign-up succeeds", !signUp.error, signUp.error?.message);
  const userId = signUp.data.session?.user.id;
  check("sign-up returns a session", Boolean(userId));
  if (!userId) process.exit(1);

  // 2. Profile bootstrap creates the self row under RLS.
  const created = await ensureOwnProfile(asBootstrapClient(client), userId, {
    displayName: "Smoke Tester",
    username: `smoke-${userId.slice(0, 8)}`,
  });
  check("profile bootstrap creates own row", created.ok && created.created, created.message);

  // 3. Bootstrap is idempotent: second call must not overwrite or fail.
  const again = await ensureOwnProfile(asBootstrapClient(client), userId, {
    displayName: "Should Not Overwrite",
  });
  check("profile bootstrap is idempotent", again.ok && !again.created, again.message);

  // 4. Forbidden: inserting a profiles row for a different user id must be
  // rejected by RLS (profiles_insert_own).
  const foreign = await client
    .from("profiles")
    .insert({ id: randomUUID(), display_name: "Intruder", username: null });
  check("cross-user profile insert is rejected by RLS", Boolean(foreign.error));

  // 5. Sign-out, then sign-in again with the same credentials.
  const signOut = await client.auth.signOut();
  check("sign-out succeeds", !signOut.error, signOut.error?.message);

  const signIn = await client.auth.signInWithPassword({ email, password });
  check("sign-in succeeds after sign-out", !signIn.error, signIn.error?.message);
  check("sign-in restores the same user", signIn.data.user?.id === userId);

  // 6. Wrong password is rejected.
  await client.auth.signOut();
  const wrong = await client.auth.signInWithPassword({ email, password: "wrong-password" });
  check("wrong password is rejected", Boolean(wrong.error));

  await client.auth.signOut();
  console.log(failures === 0 ? "\nAuth flow smoke: all checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
