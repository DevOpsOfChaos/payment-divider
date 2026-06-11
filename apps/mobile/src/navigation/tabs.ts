import type { ComponentType } from "react";

import { ClaimsScreen } from "../screens/ClaimsScreen";
import { GroupsScreen } from "../screens/GroupsScreen";
import { InboxScreen } from "../screens/InboxScreen";
import { OverviewScreen } from "../screens/OverviewScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecordScreen } from "../screens/RecordScreen";

export type TabId = "overview" | "groups" | "record" | "claims" | "inbox" | "profile";

export interface ScreenContent {
  title: string;
  purpose: string;
  placeholderLines: string[];
}

export interface TabDefinition {
  id: TabId;
  label: string;
  screen: ScreenContent;
  component?: ComponentType;
}

export const TABS: TabDefinition[] = [
  {
    id: "overview",
    label: "Übersicht",
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
    label: "Gruppen",
    component: GroupsScreen,
    screen: {
      title: "Gruppen",
      purpose: "Dauerhafte soziale Räume mit Aktivitäten darunter.",
      placeholderLines: ["Freundeskreis", "WG Berlin", "Portugal Reise Crew"],
    },
  },
  {
    id: "record",
    label: "Erfassen",
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
    label: "Forderungen",
    component: ClaimsScreen,
    screen: {
      title: "Forderungen",
      purpose: "Private Schuldennotizen mit Teilzahlungen, ohne Zahlungsausführung.",
      placeholderLines: ["Pro Person", "Neue Forderung", "Offene Forderungen"],
    },
  },
  {
    id: "inbox",
    label: "Inbox",
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
    label: "Profil",
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
];
