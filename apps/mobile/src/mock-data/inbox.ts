export interface InboxItemMock {
  title: string;
  detail: string;
  source: string;
  status: string;
  actionLabel: string;
}

export interface InboxScreenMock {
  title: string;
  subtitle: string;
  summary: string;
  items: InboxItemMock[];
}

export const INBOX_SCREEN_MOCK: InboxScreenMock = {
  title: "Inbox",
  subtitle: "Action items only, not raw history.",
  summary: "Offene Aktionen bleiben getrennt von der Timeline und fuehren keine Zahlung im App-Flow aus.",
  items: [
    {
      title: "Zahlung bestaetigen",
      detail: "Anna hat 34,00 EUR als extern erledigt markiert.",
      source: "Portugal Reise",
      status: "Bestaetigung offen",
      actionLabel: "Bestaetigung pruefen",
    },
    {
      title: "Einladung offen",
      detail: "Lukas laedt dich in Festival 2026 ein.",
      source: "Freundeskreis",
      status: "Antwort ausstehend",
      actionLabel: "Einladung ansehen",
    },
    {
      title: "Spaeter: Sync-Konflikt pruefen",
      detail: "Offline-Ausgabe wartet auf Abgleich.",
      source: "WG Allgemein",
      status: "Spaeterer Offline-Scope",
      actionLabel: "Details spaeter",
    },
  ],
};
