import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { RELEASED_LOCALES, SOURCE_LOCALE, resolveLocale } from "./locale";
import { messagesByLocale } from "./locales/registry";
import "./types";

// i18n entry point (#141): synchronous init with bundled resources only —
// no runtime/network translation, no external services, device language via
// expo-localization. Unreleased device languages fall back to the German
// source locale (see ./locale.ts for the release policy).

const deviceLanguages = getLocales().map((locale) => locale.languageCode);

void i18n.use(initReactI18next).init({
  resources: Object.fromEntries(
    RELEASED_LOCALES.map((locale) => [locale, { translation: messagesByLocale[locale] }]),
  ),
  lng: resolveLocale(deviceLanguages),
  fallbackLng: SOURCE_LOCALE,
  supportedLngs: [...RELEASED_LOCALES],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export default i18n;
