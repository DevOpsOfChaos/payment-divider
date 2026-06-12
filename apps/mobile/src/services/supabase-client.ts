import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getDataSourceMode, getSupabaseLocalConfig } from "../config/data-source";
import type { Database } from "./database.types";

// Lazy singleton client for the supabase-local data mode. Returns undefined
// when the mode is local-demo or the local stack is not configured, so
// callers fall back to the mock repositories instead of crashing.
// The client is typed against the generated schema types (database.types.ts,
// regenerated via `pnpm db:gen-types`), so table names, row shapes and
// insert/update payloads are checked at compile time.

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

  cachedClient ??= createClient<Database>(config.url, config.publicKey);
  return cachedClient;
}
