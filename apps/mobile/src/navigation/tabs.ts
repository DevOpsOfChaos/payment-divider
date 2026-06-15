import type { ComponentType } from "react";

import { ClaimsScreen } from "../screens/ClaimsScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { InboxScreen } from "../screens/InboxScreen";
import { OverviewScreen } from "../screens/OverviewScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecordScreen } from "../screens/RecordScreen";
import { RecurringCostsScreen } from "../screens/RecurringCostsScreen";

export type TabId = "overview" | "groups" | "record" | "claims" | "inbox" | "profile" | "recurring_costs";

// Tab labels are UI copy and live in the i18n locale files; the map keeps the
// keys compile-checked against the typed t(). The ScreenContent blocks below
// are MVP-1A placeholder/demo content (only rendered when a tab has no
// component), deliberately not extracted as i18n copy.
export const TAB_LABEL_KEYS = {
  overview: "navigation.tabs.overview",
  groups: "navigation.tabs.groups",
  record: "navigation.tabs.record",
  claims: "navigation.tabs.claims",
  inbox: "navigation.tabs.inbox",
  profile: "navigation.tabs.profile",
  recurring_costs: "navigation.tabs.recurringCosts",
} as const satisfies Record<TabId, string>;

export interface ScreenContent {
  title: string;
  purpose: string;
  placeholderLines: string[];
}

export interface TabDefinition {
  id: TabId;
  screen: ScreenContent;
  component?: ComponentType;
}

export const TABS: TabDefinition[] = [
  {
    id: "overview",
    component: OverviewScreen,
    screen: {
      title: "Übersicht",
      purpose: "Persönliche Ledger-Übersicht über alle Gruppen.",
      placeholderLines: [
        "Du bekommst: 84,50 €",
        "Du schuldest: 12,00 €",
        "Offene Aktionen: 2",
      ],
    },
  },
  {
    id: "groups",
    component: GroupsScreen,
    screen: {
      title: "Gruppen",
      purpose: "Dauerhafte soziale Räume mit Aktivitäten darunter.",
      placeholderLines: ["Freundeskreis", "WG Berlin", "Portugal Reise Crew"],
    },
  },
  {
    id: "record",
    component: RecordScreen,
    screen: {
      title: "Erfassen",
      purpose:
        "Schnelle Ausgabenerfassung: Betrag, Gruppe/Aktivität, Zahler, Teilnehmer, speichern.",
      placeholderLines: [
        "Betrag",
        "Gruppe / Aktivität",
        "Teilnehmer",
        "Ausgabe speichern",
      ],
    },
  },
  {
    id: "claims",
    component: ClaimsScreen,
    screen: {
      title: "Forderungen",
      purpose: "Private Schuldennotizen mit Teilzahlungen, ohne Zahlungsausführung.",
      placeholderLines: ["Pro Person", "Neue Forderung", "Offene Forderungen"],
    },
  },
  {
    id: "inbox",
    component: InboxScreen,
    screen: {
      title: "Inbox",
      purpose: "Nur Aktionen, keine rohe Historie.",
      placeholderLines: [
        "Zahlung bestätigen",
        "Einladung annehmen",
        "Später: Sync-Konflikt prüfen",
      ],
    },
  },
  {
    id: "profile",
    component: ProfileScreen,
    screen: {
      title: "Profil",
      purpose: "Persönliche Einstellungen, Sichtbarkeit und spätere Zahlungsdaten-Kontrollen.",
      placeholderLines: [
        "Anzeigename",
        "Sichtbarkeitsprofile",
        "Zahlungsdaten später verwalten",
      ],
    },
  },
  {
    id: "recurring_costs",
    component: RecurringCostsScreen,
    screen: {
      title: "Wiederkehrende Kosten",
      purpose: "Kostenplanung: geplante Anteile pro Periode. Keine Zahlungsausführung.",
      placeholderLines: ["Kostenplan", "Teilnehmer", "Vorschau"],
    },
  },
];
