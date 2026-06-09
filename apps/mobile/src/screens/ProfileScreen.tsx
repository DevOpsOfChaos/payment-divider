import { StyleSheet, Text, View } from "react-native";

import {
  PROFILE_SCREEN_MOCK,
  type PaymentControlMock,
  type PrivacyNoteMock,
  type ProfileIdentityRowMock,
  type VisibilityProfileMock,
} from "../mock-data/profile";

function IdentityRow({ label, value }: ProfileIdentityRowMock) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function VisibilityCard({ name, detail, status }: VisibilityProfileMock) {
  return (
    <View style={styles.subCard}>
      <View style={styles.row}>
        <Text style={styles.subCardTitle}>{name}</Text>
        {status ? <Text style={styles.pill}>{status}</Text> : null}
      </View>
      <Text style={styles.subCardDetail}>{detail}</Text>
    </View>
  );
}

function PaymentControlRow({ label, detail }: PaymentControlMock) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{detail}</Text>
    </View>
  );
}

function PrivacyNoteRow({ title, detail }: PrivacyNoteMock) {
  return (
    <View style={styles.noteRow}>
      <Text style={styles.noteTitle}>{title}</Text>
      <Text style={styles.noteDetail}>{detail}</Text>
    </View>
  );
}

export function ProfileScreen() {
  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{PROFILE_SCREEN_MOCK.title}</Text>
      <Text style={styles.screenPurpose}>{PROFILE_SCREEN_MOCK.subtitle}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identitaet</Text>
        <View style={styles.sectionCard}>
          {PROFILE_SCREEN_MOCK.identity.map((entry) => (
            <IdentityRow key={entry.label} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sichtbarkeitsprofile</Text>
        <View style={styles.sectionList}>
          {PROFILE_SCREEN_MOCK.visibilityProfiles.map((profile) => (
            <VisibilityCard key={profile.name} {...profile} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zahlungsdaten spaeter verwalten</Text>
        <View style={styles.sectionCard}>
          {PROFILE_SCREEN_MOCK.paymentControls.map((entry) => (
            <PaymentControlRow key={entry.label} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datenschutz</Text>
        <View style={styles.sectionCard}>
          {PROFILE_SCREEN_MOCK.privacyNotes.map((note) => (
            <PrivacyNoteRow key={note.title} {...note} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PROFILE_SCREEN_MOCK.groupHintTitle}</Text>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightText}>{PROFILE_SCREEN_MOCK.groupHintDetail}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ded4c5",
    shadowColor: "#1f1b16",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
    gap: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f1b16",
  },
  screenPurpose: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f463b",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  sectionList: {
    gap: 10,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  subCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 8,
  },
  highlightCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#efe3d2",
    borderWidth: 1,
    borderColor: "#dec8ae",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  subCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1f1b16",
  },
  subCardDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  pill: {
    maxWidth: "55%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#eadfce",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    color: "#6f6658",
  },
  noteRow: {
    gap: 4,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f1b16",
  },
  noteDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4f463b",
  },
});
