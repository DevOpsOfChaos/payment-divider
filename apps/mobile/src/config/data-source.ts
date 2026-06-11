// Data-source mode for the mobile app.
//
// "local-demo" (default): in-memory mock repositories, no network.
// "supabase-local": optional mode that talks to a locally running Supabase
// stack (supabase start). Never a production/cloud requirement; configuration
// comes from EXPO_PUBLIC_* env vars with committed placeholders only.

export type DataSourceMode = "local-demo" | "supabase-local";

export interface SupabaseLocalConfig {
  url: string;
  // Public client key of the local Supabase stack (printed by `supabase start`).
  // This is the publishable client-side key, never a service or secret key.
  publicKey: string;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getDataSourceMode(): DataSourceMode {
  return readEnv("EXPO_PUBLIC_DATA_SOURCE") === "supabase-local"
    ? "supabase-local"
    : "local-demo";
}

export function getSupabaseLocalConfig(): SupabaseLocalConfig | undefined {
  const url = readEnv("EXPO_PUBLIC_SUPABASE_URL");
  const publicKey = readEnv("EXPO_PUBLIC_SUPABASE_PUBLIC_KEY");

  if (!url || !publicKey) {
    return undefined;
  }

  return { url, publicKey };
}

// Human-readable hint for screens when supabase-local is selected but unusable.
export function getSupabaseLocalConfigHint(): string | undefined {
  if (getDataSourceMode() !== "supabase-local") {
    return undefined;
  }
  if (getSupabaseLocalConfig() === undefined) {
    return (
      "Datenmodus supabase-local gewählt, aber EXPO_PUBLIC_SUPABASE_URL / " +
      "EXPO_PUBLIC_SUPABASE_PUBLIC_KEY fehlen. Siehe .env.example — App läuft im local-demo Fallback."
    );
  }
  return undefined;
}
