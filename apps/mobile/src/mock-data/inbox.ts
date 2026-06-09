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
  summary: "Offene Aktionen bleiben getrennt von der Timeline und führen keine Zahlung im App-Flow aus.",
  items: [
    {
      title: "Zahlung bestätigen",
      detail: "Anna hat 34,00 € als extern erledigt markiert.",
      source: "Portugal Reise",
      status: "Bestätigung offen",
      actionLabel: "Bestätigung prüfen",
    },
    {
      title: "Einladung offen",
      detail: "Lukas lädt dich in Festival 2026 ein.",
      source: "Freundeskreis",
      status: "Antwort ausstehend",
      actionLabel: "Einladung ansehen",
    },
    {
      title: "Später: Sync-Konflikt prüfen",
      detail: "Offline-Ausgabe wartet auf Abgleich.",
      source: "WG Allgemein",
      status: "Späterer Offline-Scope",
      actionLabel: "Details später",
    },
  ],
};
