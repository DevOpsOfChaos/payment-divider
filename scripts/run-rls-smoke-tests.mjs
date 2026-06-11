#!/usr/bin/env node
/**
 * Runs the RLS behavior smoke tests against the locally running Supabase
 * stack (supabase start). Executes supabase/tests/rls_smoke_test.sql inside
 * the local database container via psql; the script rolls itself back, so the
 * database stays clean. No cloud connection, no secrets — the container is
 * addressed through docker exec only.
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SQL_FILE = "supabase/tests/rls_smoke_test.sql";

function findDbContainer() {
  const out = execSync(
    'docker ps --filter "label=com.supabase.cli.project=payment-divider" --filter "name=supabase_db" --format "{{.Names}}"',
    { encoding: "utf8" },
  ).trim();
  return out.split("\n")[0] || undefined;
}

const container = findDbContainer();
if (!container) {
  console.error(
    "Local Supabase database container not found. Start it first: npx supabase db start",
  );
  process.exit(1);
}

const sql = readFileSync(SQL_FILE, "utf8");

const result = spawnSync(
  "docker",
  ["exec", "-i", container, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-f", "-"],
  { input: sql, encoding: "utf8" },
);

// psql emits "raise notice" lines on stderr.
const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
const passes = combined.match(/PASS: [^\n]+/g) ?? [];

if (result.status !== 0) {
  console.error(combined);
  console.error("RLS smoke tests FAILED.");
  process.exit(1);
}

for (const line of passes) {
  console.log(line);
}
if (passes.length === 0) {
  console.error(combined);
  console.error("RLS smoke tests produced no PASS output — treating as failure.");
  process.exit(1);
}
console.log(`RLS smoke tests passed (${passes.length} assertions).`);
