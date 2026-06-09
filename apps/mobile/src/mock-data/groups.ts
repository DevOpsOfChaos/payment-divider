export type BalanceTone = "positive" | "negative" | "settled";

export interface GroupActivityMock {
  name: string;
  summary: string;
  pauseHint?: string;
}

export interface GroupCardMock {
  name: string;
  contextLabel: string;
  memberCount: number;
  balanceTone: BalanceTone;
  balanceSummary: string;
  helperText: string;
  activities: GroupActivityMock[];
}

export const GROUPS_MOCK: GroupCardMock[] = [
  {
    name: "Freundeskreis",
    contextLabel: "Dauerhafte Gruppe",
    memberCount: 4,
    balanceTone: "positive",
    balanceSummary: "Du bekommst 42,00 €",
    helperText: "Saldo aus mehreren Aktivitäten.",
    activities: [
      {
        name: "Allgemein",
        summary: "Du schuldest 8,00 €",
      },
      {
        name: "Amsterdam 2026",
        summary: "Du bekommst 50,00 €",
        pauseHint: "Max pausiert bis 07.08.",
      },
      {
        name: "Festival 2026",
        summary: "Alles ausgeglichen",
      },
    ],
  },
  {
    name: "WG Berlin",
    contextLabel: "WG",
    memberCount: 3,
    balanceTone: "negative",
    balanceSummary: "Du schuldest 18,40 €",
    helperText: "Laufende Haushaltskosten im Blick behalten.",
    activities: [
      {
        name: "Allgemein",
        summary: "Offene Ausgaben",
      },
      {
        name: "Haushalt Juni",
        summary: "Details spater",
        pauseHint: "Anna pausiert bis 30.06.",
      },
    ],
  },
  {
    name: "Portugal Reise Crew",
    contextLabel: "Reisegruppe",
    memberCount: 5,
    balanceTone: "positive",
    balanceSummary: "Du bekommst 84,50 €",
    helperText: "Externe Zahlungen werden spater nur dokumentiert.",
    activities: [
      {
        name: "Abendessen",
        summary: "42,80 € offen",
      },
      {
        name: "Mietwagen",
        summary: "Bestaetigung offen",
      },
    ],
  },
];
