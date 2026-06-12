import type { ReleasedLocale } from "../locale";
import type { Messages } from "../types";
import { de } from "./de";

// Every released locale maps to its complete message tree. Adding a locale
// here requires: (1) a complete human-reviewed language file that satisfies
// Messages, (2) adding the code to RELEASED_LOCALES in ../locale.ts. The
// parity test in i18n.test.ts fails on any structural drift.
export const messagesByLocale: Record<ReleasedLocale, Messages> = {
  de,
};
