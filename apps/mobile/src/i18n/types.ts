import type { de } from "./locales/de";

// Shape of every locale file: structurally identical to the German source.
// A future en.ts must `satisfies Messages` — TypeScript then enforces full
// key parity at compile time before the locale can even be registered.
export type Messages = typeof de;

// Typed translation keys: t("auth.signIn.title") is compile-checked.
declare module "i18next" {
  interface CustomTypeOptions {
    resources: {
      translation: Messages;
    };
  }
}
