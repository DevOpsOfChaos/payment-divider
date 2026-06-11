#!/usr/bin/env node
/**
 * Static boundary checker for Supabase SQL files.
 *
 * Payment Divider is a ledger app, not a payment provider. This script fails
 * the build when SQL files contain secret-like terms or payment-provider /
 * bank / wallet schema terms that are out of scope for the MVP schema.
 *
 * A forbidden term is tolerated only inside a SQL comment ("-- ..." or
 * inside a block comment) that clearly marks it as excluded, e.g. contains
 * "not included", "deferred", "out of scope", "omits", "excluded", or
 * "no <term>". Real schema usage (tables, columns, values) always fails.
 *
 * No dependencies. Run via: pnpm db:boundary-check
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SQL_DIR = join(ROOT, "supabase");

const FORBIDDEN_PATTERNS = [
  // secret-like terms
  /service_role/i,
  /anon[\s_-]?key/i,
  /password/i,
  /secret/i,
  // payment-provider / bank / wallet terms
  /provider_transaction/i,
  /wallet/i,
  /held_funds/i,
  /bank_account/i,
  /payment_method/i,
  /\biban\b/i,
  /paypal/i,
];

const EXCLUSION_MARKERS = [
  "not included",
  "not stored",
  "deferred",
  "out of scope",
  "omits",
  "omitted",
  "excluded",
  "excludes",
  "later scope",
  "later issue",
  "mvp 1b",
  "no ",
];

function collectSqlFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectSqlFiles(fullPath));
    } else if (entry.endsWith(".sql")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Marks which character positions of the file are inside SQL comments.
function commentMask(text) {
  const mask = new Array(text.length).fill(false);
  let i = 0;
  let state = "code"; // code | line | block | quote
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (state === "code") {
      if (two === "--") state = "line";
      else if (two === "/*") state = "block";
      else if (text[i] === "'") state = "quote";
    } else if (state === "line" && text[i] === "\n") {
      state = "code";
    } else if (state === "block" && two === "*/") {
      mask[i] = mask[i + 1] = true;
      i += 2;
      state = "code";
      continue;
    } else if (state === "quote" && text[i] === "'") {
      state = "code";
    }
    if (state === "line" || state === "block") mask[i] = true;
    i += 1;
  }
  return mask;
}

function lineIsExclusionComment(line) {
  const lower = line.toLowerCase();
  return EXCLUSION_MARKERS.some((marker) => lower.includes(marker));
}

const violations = [];

for (const file of collectSqlFiles(SQL_DIR)) {
  const text = readFileSync(file, "utf8");
  const mask = commentMask(text);
  const lines = text.split("\n");
  let offset = 0;
  lines.forEach((line, index) => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      const match = line.match(pattern);
      if (!match) continue;
      const inComment = mask[offset + match.index];
      const allowed = inComment && lineIsExclusionComment(line);
      if (!allowed) {
        violations.push({
          file: relative(ROOT, file),
          line: index + 1,
          term: match[0],
          text: line.trim(),
          inComment,
        });
      }
    }
    offset += line.length + 1;
  });
}

if (violations.length > 0) {
  console.error("SQL boundary check FAILED:\n");
  for (const v of violations) {
    const where = v.inComment ? "comment without exclusion marker" : "SQL code";
    console.error(`  ${v.file}:${v.line} [${where}] forbidden term "${v.term}"`);
    console.error(`    ${v.text}`);
  }
  console.error(
    "\nForbidden: secrets and payment-provider/bank/wallet schema terms." +
      "\nComments may mention a term only when clearly marked as not included/deferred.",
  );
  process.exit(1);
}

console.log("SQL boundary check passed: no forbidden terms in supabase/**/*.sql");
