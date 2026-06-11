import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getDataSourceMode, getSupabaseLocalConfig } from "../config/data-source";

// Lazy singleton client for the supabase-local data mode. Returns undefined
// when the mode is local-demo or the local stack is not configured, so
// callers fall back to the mock repositories instead of crashing.

let cachedClient: SupabaseClient | undefined;

export function getSupabaseClient(): SupabaseClient | undefined {
  if (getDataSourceMode() !== "supabase-local") {
    return undefined;
  }

  const config = getSupabaseLocalConfig();
  if (!config) {
    return undefined;
  }

  cachedClient ??= createClient(config.url, config.publicKey);
  return cachedClient;
}
