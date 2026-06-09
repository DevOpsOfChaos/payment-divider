import type { BalanceTone } from "./groups";
import { getPersonalBalanceSummary } from "./balance-derived";

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

const personalBalanceSummary = getPersonalBalanceSummary();

export const OVERVIEW_BALANCE_MOCK: OverviewBalanceMock = {
  heading: "Gesamtsaldo",
  amountLabel: personalBalanceSummary.label,
  helperText: "Du bekommst mehr als du schuldest.",
  tone: personalBalanceSummary.tone,
  breakdown: personalBalanceSummary.breakdown,
};

export const RECEIVABLES_MOCK: OverviewBalanceRowMock[] = [
  {
    person: "Anna",
    amount: "34,00 €",
    source: "Portugal Reise",
    statusHint: "Zahlung bestätigen",
  },
  {
    person: "Max",
    amount: "20,00 €",
    source: "WG Allgemein",
  },
  {
    person: "Leo",
    amount: "18,50 €",
    source: "Freundeskreis Allgemein",
  },
];

export const DEBTS_MOCK: OverviewBalanceRowMock[] = [
  {
    person: "Sarah",
    amount: "12,00 €",
    source: "Amsterdam 2026",
    statusHint: "Extern als bezahlt markiert",
  },
];

export const OPEN_ACTIONS_MOCK: OverviewActionMock[] = [
  {
    label: "2 Zahlungen bestätigen",
    detail: "Portugal Reise und WG Allgemein",
  },
  {
    label: "1 Einladung offen",
    detail: "Freundeskreis beitreten oder später",
  },
];

export const RECENT_ACTIVITY_MOCK: OverviewActivityMock[] = [
  {
    actor: "Anna",
    event: "hat Abendessen hinzugefügt",
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
    amountHint: "54,00 € offen",
  },
  {
    group: "WG Allgemein",
    reason: "Bestätigung ausstehend",
    amountHint: "1 Aktion",
  },
  {
    group: "Freundeskreis",
    reason: "Einladung offen",
  },
];
