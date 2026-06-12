// Source language of the app (#141). All copy here is the authoritative
// product text; other locales are derived from it via human-reviewed
// translation. Keys are stable semantic identifiers — never natural-language
// keys, never reworded casually (renaming a key is a refactor, changing a
// value is a product copy change).

export const de = {
  auth: {
    account: {
      title: "Konto",
      signedIn: "Angemeldet · Daten werden RLS-gescoped geladen.",
      signOut: "Abmelden",
    },
    signIn: {
      title: "Anmelden",
      action: "Anmelden",
    },
    signUp: {
      title: "Konto erstellen",
      action: "Konto erstellen",
    },
    form: {
      hint: "E-Mail und Passwort. Keine Session bedeutet: RLS blendet alle Daten aus.",
      email: "E-Mail",
      password: "Passwort",
      displayName: "Anzeigename",
      usernameOptional: "Benutzername (optional)",
    },
    switch: {
      toSignIn: "Schon ein Konto? Anmelden",
      toSignUp: "Neu hier? Konto erstellen",
    },
  },
  shell: {
    brand: "Payment Divider",
    title: "MVP 1A Demo",
    copy: "Lokale Demo mit Mock-Daten: nichts wird synchronisiert, es gibt kein Backend und keine Zahlungsausführung.",
    badges: {
      localOnly: "Nur lokal",
      notSynced: "Nicht synchronisiert",
      noPaymentExecution: "Keine Zahlungsausführung",
    },
  },
  navigation: {
    tabs: {
      overview: "Übersicht",
      groups: "Gruppen",
      record: "Erfassen",
      claims: "Forderungen",
      inbox: "Inbox",
      profile: "Profil",
    },
  },
  groups: {
    title: "Gruppen",
    purpose:
      "Dauerhafte Gruppen bleiben der soziale Raum. Aktivitäten darunter zeigen konkrete Ledger-Kontexte, ohne Zahlungsausführung im App-Flow.",
    switcherHint:
      "Lokaler Mock-Umschalter statt echter Navigation, damit die Detail-Screens im MVP-1A-Prototyp sichtbar bleiben.",
    modes: {
      list: "Gruppenliste",
      groupDetail: "Gruppendetail",
      activityDetail: "Aktivitätsdetail",
    },
    memberCount: "{{n}} Mitglieder",
    activitiesLabel: "Aktivitäten",
    viewDetails: "Details ansehen",
    openActivity: "Aktivität öffnen",
  },
  record: {
    title: "Ausgabe erfassen",
    purpose: "Lokale Erfassung: nichts wird synchronisiert, keine Zahlung wird ausgeführt.",
    amount: {
      label: "Betrag",
      placeholder: "z. B. 42,80",
    },
    titleField: {
      label: "Titel",
      placeholder: "z. B. Abendessen",
    },
    contextLabel: "Gruppe / Aktivität",
    payerLabel: "Bezahlt von",
    participants: {
      label: "Teilnehmer",
      hint: "Aktive Teilnehmer für Datum und Aktivität sind vorausgewählt.",
      pausedLabel: "Pausiert an diesem Datum",
      pausedHint: "Pausierte Teilnehmer können trotz Pause manuell einbezogen werden.",
    },
    splitPreviewLabel: "Aufteilung (gleichmäßig)",
    errors: {
      amount: "Betrag muss größer als 0 sein.",
      payer: "Zahler erforderlich.",
      participants: "Mindestens ein Teilnehmer erforderlich.",
    },
    save: {
      supabaseLocal: "Ausgabe lokal in Supabase speichern",
      localDemo: "Ausgabe lokal speichern",
    },
    defaultTitle: "Ausgabe",
    drafts: {
      label: "Lokale Demo-Drafts",
      paidBy: "Bezahlt von {{name}} · fließt in die Demo-Salden ein",
      hint: "Demo-Draft · nur lokal · nicht synchronisiert · keine Zahlungsausführung.",
    },
  },
  overview: {
    title: "Übersicht",
    purpose:
      "Persönliche Übersicht über offene Salden, Aktionen und relevante Gruppen ohne Zahlungsfunktion im App-Flow.",
    sections: {
      receivables: "Du bekommst",
      debts: "Du schuldest",
      openActions: "Offene Aktionen",
      recentActivity: "Letzte Aktivität",
      groupAttention: "Gruppen mit Aufmerksamkeit",
    },
  },
  inbox: {
    labels: {
      status: "Status",
      action: "Aktion",
    },
    settlement: {
      title: "Externe Zahlung",
      directionYouTo: "Du → {{name}}",
      directionToYou: "{{name}} → Du",
      ledgerOnly: "Ledger-only: Zahlung passiert außerhalb der App.",
      actions: {
        markPaid: "als extern erledigt markieren",
        confirm: "bestätigen",
        reject: "ablehnen",
      },
    },
  },
  claims: {
    title: "Forderungen",
    purpose:
      "Private Schuldennotizen: bleiben privat, außer bewusst geteilt. Keine Zahlungsausführung, keine Zahlungsaufforderungen.",
    lifecycle: {
      open: "offen",
      partiallyPaid: "teilweise bezahlt",
      settled: "erledigt",
      disputed: "Klärung nötig",
      archived: "archiviert",
    },
    counterpartyKind: {
      appUser: "App-Kontakt",
      invitedPerson: "Einladung",
      externalPerson: "Extern",
    },
    personSection: {
      title: "Pro Person",
      empty: "Keine offenen Positionen.",
      hint: "Private Forderungen und Gruppensalden pro Person: Einzelpositionen bleiben sichtbar, netto ist nur die Zusammenfassung. Abgeschlossenes wandert in den Verlauf.",
      netReceivable: "bekommst du netto",
      netOwed: "schuldest du netto",
      netSettled: "ausgeglichen",
      openForYou: "offen für dich",
      openFromYou: "offen von dir",
      historyTitle: "Verlauf ({{n}} abgeschlossen)",
    },
    position: {
      groupBalance: "Gruppensaldo",
      noPurpose: "Forderung ohne Zweck",
      claimSuffix: "Forderung",
      done: "erledigt",
    },
    card: {
      demands: "fordert",
      owesYou: "schuldet dir",
      youOwe: "du schuldest",
      noPurpose: "Ohne Zweck",
      dueAt: "fällig {{date}}",
      privateUnshared: "privat · nicht geteilt",
      paidOf: "{{paid}} von {{total}} bezahlt",
    },
    payments: {
      title: "Teilzahlungen",
      none: "Noch keine Teilzahlungen.",
      confirmed: "bestätigt",
      pendingConfirmation: "Bestätigung offen",
      inputLabel: "Teilzahlung",
      inputPlaceholder: "z. B. 5,00",
      record: "Teilzahlung erfassen",
    },
    reminder: {
      title: "Erinnerung (nur für dich)",
      dueSuffix: "fällig",
      none: "Keine Erinnerung.",
      remindTomorrow: "morgen erinnern",
      snooze: "später erinnern (+1 Tag)",
      disable: "nicht mehr erinnern",
    },
    timeline: {
      title: "Timeline",
    },
    actions: {
      acknowledge: "bestätigen",
      dispute: "ablehnen · Klärung nötig",
      archive: "archivieren",
    },
    form: {
      title: "Neue Forderung",
      owedToMe: "Mir wird geschuldet",
      owedByMe: "Ich schulde",
      newPerson: "Neue Person",
      externalPrivate: "Extern (bleibt privat)",
      invitedLinkLater: "Einladung (später verknüpfen)",
      nameLabel: "Name",
      namePlaceholder: "Name · wird als Person wiederverwendbar gespeichert",
      amountLabel: "Betrag",
      amountPlaceholder: "Betrag, z. B. 12,50",
      purposeLabel: "Zweck",
      purposePlaceholder: "Zweck (optional)",
      withoutGroup: "Ohne Gruppe",
      save: "Forderung speichern",
      errorAmount: "Betrag muss größer als 0 sein.",
      errorPerson: "Vorhandene Person wählen oder Name eingeben.",
    },
    sections: {
      open: "Offene Forderungen",
      closed: "Abgeschlossen ({{n}})",
    },
  },
  devSession: {
    title: "Lokale Dev-Session",
    active: "Session aktiv · eigenes Profil kommt aus der lokalen Datenbank.",
    none: "Keine Session · RLS blendet alle Daten aus. Nur für lokale Entwicklung, keine Production-UX.",
    start: "Dev-Session starten (nur lokal)",
    end: "Dev-Session beenden",
    createDemoGroup: "Demo-Gruppe lokal anlegen",
  },
} as const;
