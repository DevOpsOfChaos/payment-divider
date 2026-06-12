// Locale policy (#141). Pure module (no react-native / expo imports) so the
// resolution logic is unit-testable under node:test.
//
// Only RELEASED locales are ever shown to users. A locale is released when a
// complete, human-reviewed language file exists and the team decided to ship
// it — incomplete or machine-generated copy must never become visible as a
// fake quality signal. Until "en" is a real reviewed deliverable, English
// devices fall back to the German source language.

export const SOURCE_LOCALE = "de";

export const RELEASED_LOCALES = ["de"] as const;

export type ReleasedLocale = (typeof RELEASED_LOCALES)[number];

function isReleased(code: string): code is ReleasedLocale {
  return (RELEASED_LOCALES as readonly string[]).includes(code);
}

// Picks the first device language that is a released locale; everything else
// falls back to the source language. Accepts raw language codes or full tags
// ("de", "de-AT", "en-US"); only the language part counts.
export function resolveLocale(
  deviceLanguages: readonly (string | null | undefined)[],
): ReleasedLocale {
  for (const tag of deviceLanguages) {
    if (!tag) {
      continue;
    }
    const language = tag.toLowerCase().split("-")[0] ?? "";
    if (isReleased(language)) {
      return language;
    }
  }
  return SOURCE_LOCALE;
}
