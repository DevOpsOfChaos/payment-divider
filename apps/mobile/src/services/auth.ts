import { getSupabaseClient } from "./supabase-client";
import { asBootstrapClient, ensureOwnProfile, type ProfileInput } from "./profile-bootstrap";
import { msg, type ServiceMessage } from "../i18n/service-message";
import { reloadSupabaseClaims } from "../data/supabase-claims";
import { reloadSupabaseData } from "../data/supabase-repositories";

// Real Supabase auth for the supabase-local data mode (#135): e-mail +
// password sign-up/sign-in/sign-out with session persistence handled by the
// client (AsyncStorage). Developed against the local stack; works unchanged
// against a shared project once one exists. No OAuth, no magic links, no
// redirects. This is alpha tooling, not a production-ready account system.
//
// Results carry stable message keys (#142); the UI translates them.

export interface AuthResult {
  ok: boolean;
  message: ServiceMessage;
}

function reloadAll(): void {
  reloadSupabaseData();
  reloadSupabaseClaims();
}

export async function signUpWithPassword(
  email: string,
  password: string,
  profile: ProfileInput,
): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: msg("service.common.noClient") };
  }
  if (!email.trim() || !password) {
    return { ok: false, message: msg("service.auth.credentialsRequired") };
  }

  const signUp = await client.auth.signUp({ email: email.trim(), password });
  if (signUp.error) {
    return { ok: false, message: msg("service.auth.failed", { detail: signUp.error.message }) };
  }

  // Local stack default: e-mail confirmation disabled, signUp returns a
  // session. If a deployment requires confirmation, there is no session yet —
  // the profile is then bootstrapped on the first successful sign-in.
  const userId = signUp.data.session?.user.id;
  if (!userId) {
    return { ok: true, message: msg("service.auth.signUpConfirmEmail") };
  }

  const bootstrap = await ensureOwnProfile(asBootstrapClient(client), userId, profile);
  reloadAll();
  if (!bootstrap.ok && bootstrap.message) {
    return {
      ok: true,
      message: msg("service.auth.signedInWithIssue", { detail: bootstrap.message }),
    };
  }
  return { ok: true, message: msg("service.auth.signedUp") };
}

export async function signInWithPassword(
  email: string,
  password: string,
  profile?: ProfileInput,
): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: msg("service.common.noClient") };
  }
  if (!email.trim() || !password) {
    return { ok: false, message: msg("service.auth.credentialsRequired") };
  }

  const signIn = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (signIn.error) {
    return { ok: false, message: msg("service.auth.failed", { detail: signIn.error.message }) };
  }

  // Bootstrap only if a profile input was provided (e.g. sign-in directly
  // after a confirm-required sign-up); a missing profiles row otherwise just
  // means the user sees an empty profile until they complete it.
  const userId = signIn.data.user?.id;
  if (userId && profile) {
    const bootstrap = await ensureOwnProfile(asBootstrapClient(client), userId, profile);
    if (!bootstrap.ok && bootstrap.message) {
      reloadAll();
      return {
        ok: true,
        message: msg("service.auth.signedInWithIssue", { detail: bootstrap.message }),
      };
    }
  }

  reloadAll();
  return { ok: true, message: msg("service.auth.signedIn") };
}

export async function signOut(): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: msg("service.common.noClientShort") };
  }
  const { error } = await client.auth.signOut();
  reloadAll();
  if (error) {
    return { ok: false, message: msg("service.auth.signOutFailed", { detail: error.message }) };
  }
  return { ok: true, message: msg("service.auth.signedOut") };
}
