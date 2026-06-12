import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatServiceMessage, msg, type ServiceMessageKey } from "./service-message";
import { de } from "./locales/de";

// Plain test translator: looks the key up in the German source tree and
// interpolates {{param}} placeholders, mirroring what i18next does at runtime.
function fakeT(key: ServiceMessageKey, params?: Record<string, string | number>): string {
  const path = key.split(".");
  let node: unknown = de;
  for (const part of path) {
    node = (node as Record<string, unknown>)[part];
  }
  assert.equal(typeof node, "string", `key ${key} must resolve to a string`);
  let text = node as string;
  for (const [name, value] of Object.entries(params ?? {})) {
    text = text.replaceAll(`{{${name}}}`, String(value));
  }
  return text;
}

describe("msg", () => {
  it("builds a message with and without params", () => {
    assert.deepEqual(msg("service.auth.signedIn"), { key: "service.auth.signedIn" });
    assert.deepEqual(msg("service.auth.failed", { detail: "boom" }), {
      key: "service.auth.failed",
      params: { detail: "boom" },
    });
  });
});

describe("formatServiceMessage", () => {
  it("translates a plain key", () => {
    assert.equal(
      formatServiceMessage(fakeT, msg("service.auth.signedIn")),
      "Angemeldet.",
    );
  });

  it("interpolates params", () => {
    assert.equal(
      formatServiceMessage(fakeT, msg("service.auth.failed", { detail: "boom" })),
      "Anmeldung nicht möglich: boom",
    );
  });

  it("resolves a nested service message as detail", () => {
    const nested = msg("service.auth.signedInWithIssue", {
      detail: msg("service.profile.createFailed", { detail: "denied" }),
    });
    assert.equal(
      formatServiceMessage(fakeT, nested),
      "Angemeldet, aber: Profil anlegen fehlgeschlagen: denied",
    );
  });
});
