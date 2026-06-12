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
  devSession: {
    title: "Lokale Dev-Session",
    active: "Session aktiv · eigenes Profil kommt aus der lokalen Datenbank.",
    none: "Keine Session · RLS blendet alle Daten aus. Nur für lokale Entwicklung, keine Production-UX.",
    start: "Dev-Session starten (nur lokal)",
    end: "Dev-Session beenden",
    createDemoGroup: "Demo-Gruppe lokal anlegen",
  },
} as const;
