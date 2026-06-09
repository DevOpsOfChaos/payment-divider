import { StyleSheet, Text, View } from "react-native";

import { RECORD_SCREEN_MOCK, type RecordParticipantMock } from "../mock-data/record";

function SelectionRow({ name, selected, detail }: RecordParticipantMock) {
  return (
    <View style={styles.selectionRow}>
      <View style={[styles.selectionMark, selected && styles.selectionMarkActive]}>
        <Text style={[styles.selectionMarkText, selected && styles.selectionMarkTextActive]}>
          {selected ? "x" : ""}
        </Text>
      </View>
      <View style={styles.selectionCopy}>
        <Text style={styles.selectionName}>{name}</Text>
        {detail ? <Text style={styles.selectionDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

function SectionCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.valueCard}>
        <Text style={styles.valueText}>{value}</Text>
      </View>
    </View>
  );
}

export function RecordScreen() {
  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{RECORD_SCREEN_MOCK.title}</Text>
      <Text style={styles.screenPurpose}>{RECORD_SCREEN_MOCK.subtitle}</Text>

      <SectionCard
        label={RECORD_SCREEN_MOCK.amountLabel}
        value={RECORD_SCREEN_MOCK.amountValue}
      />

      <SectionCard
        label={RECORD_SCREEN_MOCK.contextLabel}
        value={RECORD_SCREEN_MOCK.contextValue}
      />

      <SectionCard
        label={RECORD_SCREEN_MOCK.payerLabel}
        value={RECORD_SCREEN_MOCK.payerValue}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{RECORD_SCREEN_MOCK.participantsTitle}</Text>
        <View style={styles.sectionCard}>
          {RECORD_SCREEN_MOCK.activeParticipants.map((participant) => (
            <SelectionRow key={participant.name} {...participant} />
          ))}
        </View>
        <Text style={styles.compactHint}>{RECORD_SCREEN_MOCK.participantsHint}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{RECORD_SCREEN_MOCK.pausedTitle}</Text>
        <View style={styles.sectionCard}>
          {RECORD_SCREEN_MOCK.pausedParticipants.map((participant) => (
            <SelectionRow key={participant.name} {...participant} />
          ))}
        </View>
        <Text style={styles.compactHint}>{RECORD_SCREEN_MOCK.pausedHint}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{RECORD_SCREEN_MOCK.infoTitle}</Text>
        <View style={styles.sectionCard}>
          {RECORD_SCREEN_MOCK.infoLines.map((line) => (
            <View key={line} style={styles.infoRow}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{RECORD_SCREEN_MOCK.validationTitle}</Text>
        <View style={styles.sectionCard}>
          {RECORD_SCREEN_MOCK.validationHints.map((hint) => (
            <View key={hint.title} style={styles.validationRow}>
              <Text style={styles.validationTitle}>{hint.title}</Text>
              <Text style={styles.validationDetail}>{hint.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{RECORD_SCREEN_MOCK.saveLabel}</Text>
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
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  valueCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
  },
  valueText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2f2922",
  },
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  selectionMark: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b8aa96",
    backgroundColor: "#fffdf8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  selectionMarkActive: {
    backgroundColor: "#1f1b16",
    borderColor: "#1f1b16",
  },
  selectionMarkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fffdf8",
  },
  selectionMarkTextActive: {
    color: "#fffdf8",
  },
  selectionCopy: {
    flex: 1,
    gap: 4,
  },
  selectionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  selectionDetail: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8b3a1a",
  },
  compactHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoBullet: {
    fontSize: 15,
    lineHeight: 21,
    color: "#b15928",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: "#4f463b",
  },
  validationRow: {
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eadfce",
  },
  validationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b3a1a",
  },
  validationDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#1f1b16",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fffaf0",
  },
});
