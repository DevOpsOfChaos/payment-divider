export interface ProfileIdentityRowMock {
  label: string;
  value: string;
}

export interface VisibilityProfileMock {
  name: string;
  detail: string;
  status?: string;
}

export interface PaymentControlMock {
  label: string;
  detail: string;
}

export interface PrivacyNoteMock {
  title: string;
  detail: string;
}

export interface ProfileScreenMock {
  title: string;
  subtitle: string;
  identity: ProfileIdentityRowMock[];
  visibilityProfiles: VisibilityProfileMock[];
  paymentControls: PaymentControlMock[];
  privacyNotes: PrivacyNoteMock[];
  groupHintTitle: string;
  groupHintDetail: string;
}

export const PROFILE_SCREEN_MOCK: ProfileScreenMock = {
  title: "Profile",
  subtitle:
    "Personal settings, visibility, and later payment-method controls.",
  identity: [
    {
      label: "Anzeigename",
      value: "Manu",
    },
    {
      label: "Username",
      value: "@manu",
    },
    {
      label: "E-Mail",
      value: "verborgen",
    },
    {
      label: "Telefon",
      value: "nicht geteilt",
    },
  ],
  visibilityProfiles: [
    {
      name: "Privat",
      detail: "Nur Anzeigename",
      status: "Aktuell in neuen Gruppen",
    },
    {
      name: "Standard",
      detail: "Anzeigename + Username",
    },
    {
      name: "Zahlungsbereit",
      detail: "Zahlungsdaten pro Gruppe freigeben",
    },
  ],
  paymentControls: [
    {
      label: "IBAN",
      detail: "gespeichert, nicht global geteilt",
    },
    {
      label: "PayPal.me",
      detail: "optional pro Gruppe",
    },
    {
      label: "Weitere Anbieter",
      detail: "spaeter",
    },
  ],
  privacyNotes: [
    {
      title: "Kontaktbuch-Sync",
      detail: "ist optional und bleibt eine bewusste Freigabe.",
    },
    {
      title: "Payment-Daten",
      detail: "werden nicht automatisch geteilt.",
    },
    {
      title: "Sichtbarkeit",
      detail: "laesst sich pro Gruppe ueber ein Profil steuern.",
    },
  ],
  groupHintTitle: "Gruppenhinweis",
  groupHintDetail:
    "Jede Gruppe waehlt ein Sichtbarkeitsprofil. Spaetere Zahlungsdaten-Kontrolle bleibt pro Gruppe oder Aktivitaet getrennt.",
};
