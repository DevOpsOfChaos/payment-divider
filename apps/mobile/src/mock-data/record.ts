export interface RecordParticipantMock {
  name: string;
  selected: boolean;
  detail?: string;
}

export interface RecordValidationHintMock {
  title: string;
  detail: string;
}

export interface RecordScreenMock {
  title: string;
  subtitle: string;
  amountLabel: string;
  amountValue: string;
  contextLabel: string;
  contextValue: string;
  payerLabel: string;
  payerValue: string;
  participantsTitle: string;
  participantsHint: string;
  activeParticipants: RecordParticipantMock[];
  pausedTitle: string;
  pausedHint: string;
  pausedParticipants: RecordParticipantMock[];
  infoTitle: string;
  infoLines: string[];
  validationTitle: string;
  validationHints: RecordValidationHintMock[];
  saveLabel: string;
}

export const RECORD_SCREEN_MOCK: RecordScreenMock = {
  title: "Ausgabe erfassen",
  subtitle: "Save fast first, enrich later.",
  amountLabel: "Betrag",
  amountValue: "42,80 €",
  contextLabel: "Gruppe / Aktivität",
  contextValue: "Portugal Reise · Abendessen",
  payerLabel: "Bezahlt von",
  payerValue: "Manu",
  participantsTitle: "Teilnehmer",
  participantsHint:
    "Alle aktiven auswählen nutzt aktive Teilnehmer für Datum + Aktivität.",
  activeParticipants: [
    { name: "Manu", selected: true },
    { name: "Anna", selected: true },
    { name: "Lukas", selected: true },
  ],
  pausedTitle: "Pausiert an diesem Datum",
  pausedHint: "Pausierte Teilnehmer bleiben sichtbar und können manuell einbezogen werden.",
  pausedParticipants: [
    {
      name: "Max",
      selected: false,
      detail: "pausiert bis 07.08. · Trotz Pause einbeziehen",
    },
  ],
  infoTitle: "Hinweise",
  infoLines: [
    "Aktive Teilnehmer sind standardmäßig vorausgewählt.",
    "Pausierte Teilnehmer zählen nicht zu Alle aktiven auswählen.",
    "Details wie Beleg, Kategorie oder Notiz kommen später.",
  ],
  validationTitle: "Validierung",
  validationHints: [
    {
      title: "Betrag",
      detail: "Betrag muss größer als 0 sein.",
    },
    {
      title: "Zahler",
      detail: "Zahler erforderlich.",
    },
    {
      title: "Teilnehmer",
      detail: "Mindestens ein Teilnehmer erforderlich.",
    },
  ],
  saveLabel: "Ausgabe speichern",
};
