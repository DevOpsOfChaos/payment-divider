import type { BalanceTone } from "./groups";
import { getActivityBalanceSummary, formatMoney } from "./balance-derived";
import { MOCK_CONTEXT_IDS, MOCK_EXPENSES, MOCK_GROUP_IDS } from "./ledger";
import { getDraftExpenses } from "../data/local-ledger";

export interface ActivityParticipantMock {
  name: string;
  detail?: string;
}

export interface ActivityExpenseMock {
  label: string;
  amount: string;
}

export interface ActivityPaymentActionMock {
  person: string;
  amount: string;
  status: string;
}

export interface ActivityTimelineItemMock {
  actor: string;
  event: string;
  dateLabel?: string;
}

export interface ActivityQuickActionMock {
  label: string;
}

export interface ActivityDetailScreenMock {
  title: string;
  subtitle: string;
  periodLabel: string;
  balanceTitle: string;
  balanceSummary: string;
  balanceTone: BalanceTone;
  balanceHint: string;
  activeParticipantsTitle: string;
  activeParticipantsHint: string;
  activeParticipants: ActivityParticipantMock[];
  pausedParticipantsTitle: string;
  pausedParticipantsHint: string;
  pausedParticipants: ActivityParticipantMock[];
  expensesTitle: string;
  expensesHint: string;
  expenses: ActivityExpenseMock[];
  paymentActionsTitle: string;
  paymentActionsHint: string;
  paymentActions: ActivityPaymentActionMock[];
  timelineTitle: string;
  timeline: ActivityTimelineItemMock[];
  quickActionsTitle: string;
  quickActions: ActivityQuickActionMock[];
}

export function buildActivityDetailMock(): ActivityDetailScreenMock {
  const amsterdamBalance = getActivityBalanceSummary(
    MOCK_GROUP_IDS.friends,
    MOCK_CONTEXT_IDS.amsterdam,
  );
  const amsterdamDrafts = getDraftExpenses().filter(
    (expense) => expense.contextId === MOCK_CONTEXT_IDS.amsterdam,
  );
  const amsterdamExpenses = MOCK_EXPENSES.filter(
    (expense) => expense.contextId === MOCK_CONTEXT_IDS.amsterdam,
  );
  const draftTimeline: ActivityTimelineItemMock[] = amsterdamDrafts.map((draft) => ({
    actor: "Du",
    event: `hast ${draft.title ?? "Ausgabe"} als Demo-Draft hinzugefügt · nur lokal`,
    dateLabel: "Jetzt",
  }));

  return {
  title: "Amsterdam 2026",
  subtitle: "Freundeskreis · Reiseaktivität",
  periodLabel: "01.08.-07.08. · Teilnehmerstatus gilt für diese Aktivität.",
  balanceTitle: "Aktivitätssaldo",
  balanceSummary: amsterdamBalance.label,
  balanceTone: amsterdamBalance.tone,
  balanceHint: "Nur Salden aus dieser Aktivität, nicht aus der restlichen Gruppe.",
  activeParticipantsTitle: "Aktive Teilnehmer",
  activeParticipantsHint:
    "Aktive Teilnehmer sind für Datum plus Aktivität standardmäßig vorausgewählt.",
  activeParticipants: [{ name: "Manu" }, { name: "Anna" }, { name: "Lukas" }],
  pausedParticipantsTitle: "Pausiert",
  pausedParticipantsHint:
    "Pausierte Teilnehmer bleiben sichtbar und wären manuell weiterhin einbeziehbar.",
  pausedParticipants: [
    {
      name: "Max",
      detail: "pausiert bis 07.08. · nicht standardmäßig ausgewählt",
    },
  ],
  expensesTitle: "Ausgaben",
  expensesHint: "Hier erscheinen nur Ausgaben aus Amsterdam 2026.",
  expenses: [
    ...amsterdamExpenses.map((expense) => ({
      label: expense.title ?? "Ausgabe",
      amount: formatMoney(expense.amount),
    })),
    ...amsterdamDrafts.map((expense) => ({
      label: `${expense.title ?? "Ausgabe"} · Demo-Draft`,
      amount: formatMoney(expense.amount),
    })),
  ],
  paymentActionsTitle: "Zahlungsaktionen",
  paymentActionsHint:
    "Ledger-only Vorschau: externe Zahlung wird nur markiert oder bestätigt.",
  paymentActions: [
    { person: "Anna", amount: "34,00 €", status: "Bestätigung offen" },
    { person: "Sarah", amount: "12,00 €", status: "extern erledigt markiert" },
  ],
  timelineTitle: "Timeline",
  timeline: [
    ...draftTimeline,
    { actor: "Anna", event: "hat Abendessen hinzugefügt", dateLabel: "Heute" },
    {
      actor: "Max",
      event: "wurde für diesen Zeitraum pausiert",
      dateLabel: "Mo",
    },
  ],
  quickActionsTitle: "Schnelle Aktionen",
  quickActions: [
    { label: "Ausgabe erfassen" },
    { label: "Zahlung bestätigen" },
    { label: "Details ansehen" },
  ],
  };
}
