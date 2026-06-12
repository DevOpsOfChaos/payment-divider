import { getSupabaseClient } from "./supabase-client";
import { getAppEnv, isDevSessionAllowed } from "../config/app-env";
import { msg, type ServiceMessage } from "../i18n/service-message";
import { reloadSupabaseClaims } from "../data/supabase-claims";
import { reloadSupabaseData } from "../data/supabase-repositories";

// Dev-only session helper for the supabase-local mode. Signs a fixed local
// test user in against the locally running Supabase stack (sign-up on first
// use), and makes sure a matching profiles row exists. This is explicitly not
// a production auth flow: fixed credentials, local stack only, no secrets —
// the values below never work against any real deployment.
//
// Hard environment gate: startDevSession refuses to run unless
// EXPO_PUBLIC_APP_ENV resolves to "local" (see ../config/app-env.ts). Shared
// alpha and production builds must use real Supabase auth instead.
//
// Results carry stable message keys (#142); the UI translates them.

const DEV_EMAIL = "dev@local.test";
const DEV_PASSWORD = "local-dev-only-session";
const DEV_DISPLAY_NAME = "Dev User";
const DEV_USERNAME = "dev";

export interface DevSessionResult {
  ok: boolean;
  message: ServiceMessage;
}

export async function startDevSession(): Promise<DevSessionResult> {
  if (!isDevSessionAllowed()) {
    return { ok: false, message: msg("service.devSession.blocked", { env: getAppEnv() }) };
  }
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: msg("service.common.noClient") };
  }

  let signIn = await client.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  if (signIn.error) {
    const signUp = await client.auth.signUp({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (signUp.error) {
      return {
        ok: false,
        message: msg("service.devSession.startFailed", { detail: signUp.error.message }),
      };
    }
    signIn = await client.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (signIn.error) {
      return {
        ok: false,
        message: msg("service.devSession.loginFailed", { detail: signIn.error.message }),
      };
    }
  }

  const userId = signIn.data.user?.id;
  if (userId) {
    // profiles_insert_own / profiles_update_own allow exactly this self-row.
    const { error: profileError } = await client
      .from("profiles")
      .upsert({ id: userId, display_name: DEV_DISPLAY_NAME, username: DEV_USERNAME });
    if (profileError) {
      reloadSupabaseData();
      reloadSupabaseClaims();
      return {
        ok: true,
        message: msg("service.devSession.profileUpsertFailed", {
          detail: profileError.message,
        }),
      };
    }
  }

  reloadSupabaseData();
  reloadSupabaseClaims();
  return { ok: true, message: msg("service.devSession.active") };
}

export async function endDevSession(): Promise<DevSessionResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: msg("service.common.noClientShort") };
  }
  await client.auth.signOut();
  reloadSupabaseData();
  reloadSupabaseClaims();
  return { ok: true, message: msg("service.devSession.ended") };
}
