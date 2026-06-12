// App environment tier for the mobile app, separate from the data-source mode.
//
// "local" (default): developer machine, local Supabase stack allowed, dev
// session allowed. "shared-alpha": invited testers against a shared backend.
// "production": later, real users. The tier comes from EXPO_PUBLIC_APP_ENV
// and is fail-closed: any value other than an unset variable or the exact
// string "local" is treated as a shared environment, so a typo in a shared
// build config can never accidentally unlock dev-only code paths.

export type AppEnv = "local" | "shared-alpha" | "production";

export function getAppEnv(): AppEnv {
  // Static member access so Expo can inline the value at build time.
  const raw = process.env.EXPO_PUBLIC_APP_ENV?.trim();
  if (!raw || raw === "local") {
    return "local";
  }
  if (raw === "shared-alpha") {
    return "shared-alpha";
  }
  // Unknown values fall through to the most restrictive tier (fail-closed).
  return "production";
}

// The dev session (fixed local test credentials) is a local-development-only
// tool. It must be impossible to start in any shared or production build,
// regardless of data-source mode or Supabase URL.
export function isDevSessionAllowed(): boolean {
  return getAppEnv() === "local";
}

// The user-facing blocked notice lives in the locale files
// (service.devSession.blocked); services attach it via its message key.
