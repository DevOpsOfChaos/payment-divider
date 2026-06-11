/**
 * Proves the database trigger enforces exactly the same claim status
 * transition table as the core (issue #106). Reads the pair list between the
 * PARITY-PAIRS markers in the hardening migration and compares the full
 * from->to matrix against CLAIM_STATUS_TRANSITIONS. Fails loudly on any
 * drift in either direction. Pure file/import check — no database needed,
 * runs in CI via `pnpm test`.
 */

import { readFileSync } from "node:fs";

import {
  CLAIM_STATUS_TRANSITIONS,
  type ClaimStatus,
} from "../packages/core/src/claims";

const MIGRATION_FILE =
  "supabase/migrations/20260612120000_claim_status_transition_hardening.sql";

const sql = readFileSync(MIGRATION_FILE, "utf8");
const begin = sql.indexOf("PARITY-PAIRS-BEGIN");
const end = sql.indexOf("PARITY-PAIRS-END");
if (begin === -1 || end === -1 || end <= begin) {
  console.error(`Parity markers not found in ${MIGRATION_FILE}.`);
  process.exit(1);
}

const sqlPairs = new Set<string>();
for (const match of sql.slice(begin, end).matchAll(/'(\w+)->(\w+)'/g)) {
  sqlPairs.add(`${match[1]}->${match[2]}`);
}

const corePairs = new Set<string>();
const statuses = Object.keys(CLAIM_STATUS_TRANSITIONS) as ClaimStatus[];
for (const from of statuses) {
  for (const to of CLAIM_STATUS_TRANSITIONS[from]) {
    corePairs.add(`${from}->${to}`);
  }
}

const missingInSql = [...corePairs].filter((pair) => !sqlPairs.has(pair));
const extraInSql = [...sqlPairs].filter((pair) => !corePairs.has(pair));

if (missingInSql.length > 0 || extraInSql.length > 0) {
  if (missingInSql.length > 0) {
    console.error(`Allowed in core but missing in SQL: ${missingInSql.join(", ")}`);
  }
  if (extraInSql.length > 0) {
    console.error(`Allowed in SQL but not in core: ${extraInSql.join(", ")}`);
  }
  console.error(
    "Core and database claim status transition tables have drifted apart.",
  );
  process.exit(1);
}

console.log(
  `Claim transition parity check passed: ${corePairs.size} allowed transitions identical in core and ${MIGRATION_FILE}.`,
);
