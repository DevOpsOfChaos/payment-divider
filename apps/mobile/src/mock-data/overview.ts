import type { BalanceTone } from "./groups";

export interface OverviewBalanceMock {
  heading: string;
  amountLabel: string;
  helperText: string;
  tone: BalanceTone;
  breakdown: string;
}

export interface OverviewBalanceRowMock {
  person: string;
  amount: string;
  source: string;
  statusHint?: string;
}

export interface OverviewActionMock {
  label: string;
  detail: string;
}

export interface OverviewActivityMock {
  actor: string;
  event: string;
  source: string;
  dateLabel: string;
}

export interface OverviewAttentionMock {
  group: string;
  reason: string;
  amountHint?: string;
}

export const OVERVIEW_BALANCE_MOCK: OverviewBalanceMock = {
  heading: "Gesamtsaldo",
  amountLabel: "Du bekommst 84,50 EUR",
  helperText: "Du bekommst mehr als du schuldest.",
  tone: "positive",
  breakdown: "Forderungen 96,50 EUR · Schulden 12,00 EUR",
};

export const RECEIVABLES_MOCK: OverviewBalanceRowMock[] = [
  {
    person: "Anna",
    amount: "34,00 EUR",
    source: "Portugal Reise",
    statusHint: "Zahlung bestaetigen",
  },
  {
    person: "Max",
    amount: "20,00 EUR",
    source: "WG Allgemein",
  },
  {
    person: "Leo",
    amount: "18,50 EUR",
    source: "Freundeskreis Allgemein",
  },
];

export const DEBTS_MOCK: OverviewBalanceRowMock[] = [
  {
    person: "Sarah",
    amount: "12,00 EUR",
    source: "Amsterdam 2026",
    statusHint: "Extern als bezahlt markiert",
  },
];

export const OPEN_ACTIONS_MOCK: OverviewActionMock[] = [
  {
    label: "2 Zahlungen bestaetigen",
    detail: "Portugal Reise und WG Allgemein",
  },
  {
    label: "1 Einladung offen",
    detail: "Freundeskreis beitreten oder spaeter",
  },
];

export const RECENT_ACTIVITY_MOCK: OverviewActivityMock[] = [
  {
    actor: "Anna",
    event: "hat Abendessen hinzugefuegt",
    source: "Portugal Reise",
    dateLabel: "Heute",
  },
  {
    actor: "Max",
    event: "hat eine Zahlung markiert",
    source: "WG Allgemein",
    dateLabel: "Gestern",
  },
  {
    actor: "Sarah",
    event: "hat Teilnahme pausiert",
    source: "Amsterdam 2026",
    dateLabel: "Mo",
  },
];

export const GROUP_ATTENTION_MOCK: OverviewAttentionMock[] = [
  {
    group: "Portugal Reise",
    reason: "Offene Forderungen",
    amountHint: "54,00 EUR offen",
  },
  {
    group: "WG Allgemein",
    reason: "Bestaetigung ausstehend",
    amountHint: "1 Aktion",
  },
  {
    group: "Freundeskreis",
    reason: "Einladung offen",
  },
];
