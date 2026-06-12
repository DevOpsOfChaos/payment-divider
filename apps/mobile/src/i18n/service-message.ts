import { de } from "./locales/de";

// Structured service-layer messages (#142). Services and data adapters never
// hold translated copy: they return a stable key into the `service` block of
// the locale files plus optional params; only the UI translates (via
// formatServiceMessage with the active t()). This module is pure — no
// react-native, expo or i18next runtime imports — so node-tested services can
// depend on it freely.

type LeafPaths<T, Prefix extends string> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : LeafPaths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type ServiceMessageKey = LeafPaths<typeof de.service, "service.">;

// Param values are plain data or a nested ServiceMessage (e.g. a profile
// bootstrap failure embedded in an auth result); nesting is resolved at
// format time, never inside services.
export type ServiceMessageParam = string | number | ServiceMessage;

export interface ServiceMessage {
  key: ServiceMessageKey;
  params?: Record<string, ServiceMessageParam>;
}

export function msg(
  key: ServiceMessageKey,
  params?: Record<string, ServiceMessageParam>,
): ServiceMessage {
  return params ? { key, params } : { key };
}

// Accepts the react-i18next t() without importing its types. The typed t()
// statically requires the exact interpolation params per key, which a
// runtime-dispatched key union cannot satisfy — the cast below is the single
// place where that strictness is intentionally bypassed; key validity itself
// stays compile-checked via ServiceMessageKey at every msg() call site.
export function formatServiceMessage(t: unknown, message: ServiceMessage): string {
  const translate = t as unknown as (
    key: ServiceMessageKey,
    params?: Record<string, string | number>,
  ) => string;
  const resolved: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(message.params ?? {})) {
    resolved[name] =
      typeof value === "object" ? formatServiceMessage(t, value) : value;
  }
  return translate(message.key, resolved);
}
