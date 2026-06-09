import type { BalanceTone } from "./groups";
import { getActivityBalanceSummary, getGroupBalanceSummary } from "./balance-derived";
import { MOCK_CONTEXT_IDS, MOCK_GROUP_IDS } from "./ledger";

export interface GroupDetailActivityMock {
  name: string;
  detail: string;
  balanceTone: BalanceTone;
  balanceSummary: string;
  pauseHint?: string;
}

export interface GroupMemberMock {
  name: string;
  status: string;
  statusTone?: "default" | "warning";
}

export interface GroupTimelineItemMock {
  actor: string;
  event: string;
  source?: string;
  dateLabel: string;
}

export interface GroupQuickActionMock {
  label: string;
}

export interface GroupDetailScreenMock {
  title: string;
  subtitle: string;
  balanceTitle: string;
  balanceSummary: string;
  balanceTone: BalanceTone;
  balanceHint: string;
  activitiesTitle: string;
  activities: GroupDetailActivityMock[];
  membersTitle: string;
  membersHint: string;
  members: GroupMemberMock[];
  timelineTitle: string;
  timelineHint: string;
  timeline: GroupTimelineItemMock[];
  quickActionsTitle: string;
  quickActions: GroupQuickActionMock[];
}

const groupBalance = getGroupBalanceSummary(MOCK_GROUP_IDS.friends);
const generalBalance = getActivityBalanceSummary(
  MOCK_GROUP_IDS.friends,
  MOCK_CONTEXT_IDS.friendsGeneral,
);
const amsterdamBalance = getActivityBalanceSummary(
  MOCK_GROUP_IDS.friends,
  MOCK_CONTEXT_IDS.amsterdam,
);
const festivalBalance = getActivityBalanceSummary(
  MOCK_GROUP_IDS.friends,
  MOCK_CONTEXT_IDS.festival,
);

export const GROUP_DETAIL_SCREEN_MOCK: GroupDetailScreenMock = {
  title: "Freundeskreis",
  subtitle: "Dauerhafte Gruppe · 4 Mitglieder",
  balanceTitle: "Gruppensaldo",
  balanceSummary: groupBalance.label,
  balanceTone: groupBalance.tone,
  balanceHint: "Aktivitätssalden rollen in diesen Gruppensaldo hoch.",
  activitiesTitle: "Aktivitäten",
  activities: [
    {
      name: "Allgemein",
      detail: "Standardaktivität",
      balanceTone: generalBalance.tone,
      balanceSummary: generalBalance.label,
    },
    {
      name: "Amsterdam 2026",
      detail: "Reiseaktivität · 01.08.-07.08.",
      balanceTone: amsterdamBalance.tone,
      balanceSummary: amsterdamBalance.label,
      pauseHint: "Max pausiert bis 07.08.",
    },
    {
      name: "Festival 2026",
      detail: "Wochenendkontext",
      balanceTone: festivalBalance.tone,
      balanceSummary: festivalBalance.label,
    },
  ],
  membersTitle: "Mitglieder",
  membersHint:
    "Pausierte Teilnehmer bleiben Gruppenmitglieder und behalten Historie sowie Salden.",
  members: [
    { name: "Manu", status: "aktiv" },
    { name: "Anna", status: "aktiv" },
    { name: "Max", status: "pausiert für Amsterdam 2026", statusTone: "warning" },
    { name: "Lukas", status: "aktiv" },
  ],
  timelineTitle: "Timeline",
  timelineHint: "Verlauf zeigt Ledger-Ereignisse, keine Inbox-Aktionen.",
  timeline: [
    {
      actor: "Anna",
      event: "hat Abendessen hinzugefügt",
      source: "Amsterdam 2026",
      dateLabel: "Heute",
    },
    {
      actor: "Max",
      event: "wurde pausiert",
      source: "Amsterdam 2026",
      dateLabel: "Mo",
    },
    {
      actor: "Lukas",
      event: "hat Zahlung extern erledigt markiert",
      source: "Allgemein",
      dateLabel: "So",
    },
  ],
  quickActionsTitle: "Schnelle Aktionen",
  quickActions: [
    { label: "Ausgabe erfassen" },
    { label: "Aktivität erstellen" },
    { label: "Teilnehmer pausieren" },
  ],
};
