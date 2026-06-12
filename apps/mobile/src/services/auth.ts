import { getSupabaseClient } from "./supabase-client";
import { asBootstrapClient, ensureOwnProfile, type ProfileInput } from "./profile-bootstrap";
import { reloadSupabaseClaims } from "../data/supabase-claims";
import { reloadSupabaseData } from "../data/supabase-repositories";

// Real Supabase auth for the supabase-local data mode (#135): e-mail +
// password sign-up/sign-in/sign-out with session persistence handled by the
// client (AsyncStorage). Developed against the local stack; works unchanged
// against a shared project once one exists. No OAuth, no magic links, no
// redirects. This is alpha tooling, not a production-ready account system.

export interface AuthResult {
  ok: boolean;
  message: string;
}

function describeAuthError(message: string): string {
  // Neutral wording; the raw server message is appended for debugging.
  return `Anmeldung nicht möglich: ${message}`;
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
    return { ok: false, message: "Kein Supabase-Client konfiguriert (siehe .env.example)." };
  }
  if (!email.trim() || !password) {
    return { ok: false, message: "E-Mail und Passwort werden benötigt." };
  }

  const signUp = await client.auth.signUp({ email: email.trim(), password });
  if (signUp.error) {
    return { ok: false, message: describeAuthError(signUp.error.message) };
  }

  // Local stack default: e-mail confirmation disabled, signUp returns a
  // session. If a deployment requires confirmation, there is no session yet —
  // the profile is then bootstrapped on the first successful sign-in.
  const userId = signUp.data.session?.user.id;
  if (!userId) {
    return {
      ok: true,
      message: "Registriert. Bitte E-Mail bestätigen und danach anmelden.",
    };
  }

  const bootstrap = await ensureOwnProfile(asBootstrapClient(client), userId, profile);
  reloadAll();
  if (!bootstrap.ok) {
    return { ok: true, message: `Angemeldet, aber: ${bootstrap.message}` };
  }
  return { ok: true, message: "Konto erstellt und angemeldet." };
}

export async function signInWithPassword(
  email: string,
  password: string,
  profile?: ProfileInput,
): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Kein Supabase-Client konfiguriert (siehe .env.example)." };
  }
  if (!email.trim() || !password) {
    return { ok: false, message: "E-Mail und Passwort werden benötigt." };
  }

  const signIn = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (signIn.error) {
    return { ok: false, message: describeAuthError(signIn.error.message) };
  }

  // Bootstrap only if a profile input was provided (e.g. sign-in directly
  // after a confirm-required sign-up); a missing profiles row otherwise just
  // means the user sees an empty profile until they complete it.
  const userId = signIn.data.user?.id;
  if (userId && profile) {
    const bootstrap = await ensureOwnProfile(asBootstrapClient(client), userId, profile);
    if (!bootstrap.ok) {
      reloadAll();
      return { ok: true, message: `Angemeldet, aber: ${bootstrap.message}` };
    }
  }

  reloadAll();
  return { ok: true, message: "Angemeldet." };
}

export async function signOut(): Promise<AuthResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: "Kein Supabase-Client konfiguriert." };
  }
  const { error } = await client.auth.signOut();
  reloadAll();
  if (error) {
    return { ok: false, message: `Abmelden fehlgeschlagen: ${error.message}` };
  }
  return { ok: true, message: "Abgemeldet." };
}
