export type TabId = "overview" | "groups" | "record" | "inbox" | "profile";

export interface ScreenContent {
  title: string;
  purpose: string;
  placeholderLines: string[];
}

export interface TabDefinition {
  id: TabId;
  label: string;
  screen: ScreenContent;
}

export const TABS: TabDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    screen: {
      title: "Overview",
      purpose: "Personal ledger summary across all groups.",
      placeholderLines: [
        "Du bekommst: 84,50 €",
        "Du schuldest: 12,00 €",
        "Offene Aktionen: 2",
      ],
    },
  },
  {
    id: "groups",
    label: "Groups",
    screen: {
      title: "Groups",
      purpose: "Long-lived social spaces with activities inside them.",
      placeholderLines: ["Freundeskreis", "WG Berlin", "Portugal Reise Crew"],
    },
  },
  {
    id: "record",
    label: "Record",
    screen: {
      title: "Record",
      purpose:
        "Fast expense entry: amount, group/activity, payer, participants, save.",
      placeholderLines: [
        "Betrag",
        "Gruppe / Aktivität",
        "Teilnehmer",
        "Ausgabe speichern",
      ],
    },
  },
  {
    id: "inbox",
    label: "Inbox",
    screen: {
      title: "Inbox",
      purpose: "Action items only, not raw history.",
      placeholderLines: [
        "Zahlung bestätigen",
        "Einladung annehmen",
        "Später: Sync-Konflikt prüfen",
      ],
    },
  },
  {
    id: "profile",
    label: "Profile",
    screen: {
      title: "Profile",
      purpose: "Personal settings, visibility, and later payment-method controls.",
      placeholderLines: [
        "Anzeigename",
        "Sichtbarkeitsprofile",
        "Zahlungsdaten später verwalten",
      ],
    },
  },
];
