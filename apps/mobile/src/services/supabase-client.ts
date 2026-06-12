import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

import { getDataSourceMode, getSupabaseLocalConfig } from "../config/data-source";
import type { Database } from "./database.types";

// Lazy singleton client for the supabase-local data mode. Returns undefined
// when the mode is local-demo or the local stack is not configured, so
// callers fall back to the mock repositories instead of crashing.
// The client is typed against the generated schema types (database.types.ts,
// regenerated via `pnpm db:gen-types`), so table names, row shapes and
// insert/update payloads are checked at compile time.
//
// Sessions persist in AsyncStorage (#135), so a signed-in user stays signed
// in across app restarts. Token auto-refresh only runs while the app is in
// the foreground, as recommended for React Native by the supabase-js docs.

export type AppSupabaseClient = SupabaseClient<Database>;

let cachedClient: AppSupabaseClient | undefined;

export function getSupabaseClient(): AppSupabaseClient | undefined {
  if (getDataSourceMode() !== "supabase-local") {
    return undefined;
  }

  const config = getSupabaseLocalConfig();
  if (!config) {
    return undefined;
  }

  if (!cachedClient) {
    cachedClient = createClient<Database>(config.url, config.publicKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

    const client = cachedClient;
    AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });
  }
  return cachedClient;
}
