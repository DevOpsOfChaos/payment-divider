import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RELEASED_LOCALES, SOURCE_LOCALE, resolveLocale } from "./locale";
import { de } from "./locales/de";
import { messagesByLocale } from "./locales/registry";

describe("resolveLocale", () => {
  it("returns a released device language", () => {
    assert.equal(resolveLocale(["de"]), "de");
    assert.equal(resolveLocale(["de-AT"]), "de");
    assert.equal(resolveLocale(["DE-de"]), "de");
  });

  it("falls back to the source locale for unreleased languages", () => {
    assert.equal(resolveLocale(["en"]), SOURCE_LOCALE);
    assert.equal(resolveLocale(["en-US", "fr-FR"]), SOURCE_LOCALE);
  });

  it("skips empty entries and picks the first released match", () => {
    assert.equal(resolveLocale([null, undefined, "", "en-GB", "de-CH"]), "de");
  });

  it("falls back on an empty device list", () => {
    assert.equal(resolveLocale([]), SOURCE_LOCALE);
  });
});

type Tree = { [key: string]: string | Tree };

function collectKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : collectKeys(value, path);
  });
}

function collectEmptyValues(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      return value.trim().length === 0 ? [path] : [];
    }
    return collectEmptyValues(value, path);
  });
}

describe("released locale files", () => {
  it("every released locale is registered", () => {
    for (const locale of RELEASED_LOCALES) {
      assert.ok(messagesByLocale[locale], `missing message tree for ${locale}`);
    }
  });

  it("every released locale has exactly the source key set", () => {
    const sourceKeys = collectKeys(de).sort();
    assert.ok(sourceKeys.length > 0);
    for (const locale of RELEASED_LOCALES) {
      const keys = collectKeys(messagesByLocale[locale]).sort();
      assert.deepEqual(
        keys,
        sourceKeys,
        `locale ${locale} drifted from the source key set`,
      );
    }
  });

  it("no released locale contains empty strings", () => {
    for (const locale of RELEASED_LOCALES) {
      assert.deepEqual(
        collectEmptyValues(messagesByLocale[locale]),
        [],
        `locale ${locale} has empty values`,
      );
    }
  });
});
