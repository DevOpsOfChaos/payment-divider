import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { splitExpenseEqually, type EntityId } from "@payment-divider/core";

import {
  appRepositories,
  formatMoney,
  type RecordParticipantOption,
  type RecordSetupData,
} from "../data";

interface LocalExpenseDraft {
  id: string;
  title: string;
  amountMinor: number;
  payerName: string;
  participantNames: string[];
}

// Parses German money input like "42,80" or "1.250,00" into integer cents.
function parseGermanAmountToMinor(rawText: string): number | undefined {
  const normalized = rawText.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined;
  }

  return Math.round(Number.parseFloat(normalized) * 100);
}

function SelectionRow({
  name,
  selected,
  detail,
  onPress,
}: {
  name: string;
  selected: boolean;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="checkbox" onPress={onPress} style={styles.selectionRow}>
      <View style={[styles.selectionMark, selected && styles.selectionMarkActive]}>
        <Text style={styles.selectionMarkText}>{selected ? "x" : ""}</Text>
      </View>
      <View style={styles.selectionCopy}>
        <Text style={styles.selectionName}>{name}</Text>
        {detail ? <Text style={styles.selectionDetail}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

function buildInitialSelection(setup: RecordSetupData): Set<EntityId> {
  return new Set(
    setup.participants
      .filter((participant) => participant.defaultSelected)
      .map((participant) => participant.userId),
  );
}

export function RecordScreen() {
  const setup = useMemo(() => appRepositories.getRecordSetup(), []);
  const [amountText, setAmountText] = useState("");
  const [title, setTitle] = useState("");
  const [payerUserId, setPayerUserId] = useState<EntityId>(setup.defaultPayerUserId);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<EntityId>>(() =>
    buildInitialSelection(setup),
  );
  const [drafts, setDrafts] = useState<LocalExpenseDraft[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const amountMinor = parseGermanAmountToMinor(amountText);
  const selectedParticipants = setup.participants.filter((participant) =>
    selectedUserIds.has(participant.userId),
  );
  const payerExists = setup.payerOptions.some((option) => option.userId === payerUserId);

  const errors: string[] = [];
  if (amountMinor === undefined || amountMinor <= 0) {
    errors.push("Betrag muss größer als 0 sein.");
  }
  if (!payerExists) {
    errors.push("Zahler erforderlich.");
  }
  if (selectedParticipants.length === 0) {
    errors.push("Mindestens ein Teilnehmer erforderlich.");
  }

  const splitPreview =
    amountMinor !== undefined && amountMinor > 0 && selectedParticipants.length > 0
      ? splitExpenseEqually({
          amount: amountMinor,
          currency: setup.currency,
          participantUserIds: selectedParticipants.map((participant) => participant.userId),
        }).map((share) => ({
          name:
            setup.participants.find((participant) => participant.userId === share.userId)
              ?.name ?? share.userId,
          amountLabel: formatMoney(share.amount),
        }))
      : [];

  function toggleParticipant(userId: EntityId) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function saveDraft() {
    if (errors.length > 0 || amountMinor === undefined) {
      setShowErrors(true);
      return;
    }

    const payerName =
      setup.payerOptions.find((option) => option.userId === payerUserId)?.name ?? payerUserId;

    setDrafts((current) => [
      ...current,
      {
        id: `draft-${Date.now()}-${current.length}`,
        title: title.trim() || "Ausgabe",
        amountMinor,
        payerName,
        participantNames: selectedParticipants.map((participant) => participant.name),
      },
    ]);
    setAmountText("");
    setTitle("");
    setSelectedUserIds(buildInitialSelection(setup));
    setShowErrors(false);
  }

  const activeParticipants = setup.participants.filter((participant) => !participant.paused);
  const pausedParticipants = setup.participants.filter((participant) => participant.paused);

  function renderParticipant(participant: RecordParticipantOption) {
    return (
      <SelectionRow
        key={participant.userId}
        name={participant.name}
        selected={selectedUserIds.has(participant.userId)}
        detail={participant.pausedDetail}
        onPress={() => toggleParticipant(participant.userId)}
      />
    );
  }

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>Ausgabe erfassen</Text>
      <Text style={styles.screenPurpose}>
        Lokale Erfassung: nichts wird synchronisiert, keine Zahlung wird ausgeführt.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Betrag</Text>
        <TextInput
          style={styles.input}
          value={amountText}
          onChangeText={setAmountText}
          placeholder="z. B. 42,80"
          keyboardType="decimal-pad"
          accessibilityLabel="Betrag"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Titel</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="z. B. Abendessen"
          accessibilityLabel="Titel"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Gruppe / Aktivität</Text>
        <View style={styles.valueCard}>
          <Text style={styles.valueText}>{setup.contextLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Bezahlt von</Text>
        <View style={styles.sectionCard}>
          {setup.payerOptions.map((option) => (
            <SelectionRow
              key={option.userId}
              name={option.name}
              selected={option.userId === payerUserId}
              onPress={() => setPayerUserId(option.userId)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Teilnehmer</Text>
        <View style={styles.sectionCard}>{activeParticipants.map(renderParticipant)}</View>
        <Text style={styles.compactHint}>
          Aktive Teilnehmer für Datum und Aktivität sind vorausgewählt.
        </Text>
      </View>

      {pausedParticipants.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pausiert an diesem Datum</Text>
          <View style={styles.sectionCard}>{pausedParticipants.map(renderParticipant)}</View>
          <Text style={styles.compactHint}>
            Pausierte Teilnehmer können trotz Pause manuell einbezogen werden.
          </Text>
        </View>
      ) : null}

      {splitPreview.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Aufteilung (gleichmäßig)</Text>
          <View style={styles.sectionCard}>
            {splitPreview.map((share) => (
              <View key={share.name} style={styles.previewRow}>
                <Text style={styles.previewName}>{share.name}</Text>
                <Text style={styles.previewAmount}>{share.amountLabel}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {showErrors && errors.length > 0 ? (
        <View style={styles.errorCard}>
          {errors.map((error) => (
            <Text key={error} style={styles.errorText}>
              {error}
            </Text>
          ))}
        </View>
      ) : null}

      <Pressable accessibilityRole="button" onPress={saveDraft} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Ausgabe lokal speichern</Text>
      </Pressable>

      {drafts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Lokale Entwürfe</Text>
          <View style={styles.sectionCard}>
            {drafts.map((draft) => (
              <View key={draft.id} style={styles.draftRow}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewName}>{draft.title}</Text>
                  <Text style={styles.previewAmount}>{formatMoney(draft.amountMinor)}</Text>
                </View>
                <Text style={styles.draftMeta}>
                  Bezahlt von {draft.payerName} · {draft.participantNames.join(", ")}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.compactHint}>
            Nur lokal gespeichert · nicht synchronisiert · keine Zahlungsausführung.
          </Text>
        </View>
      ) : null}
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
  input: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#b8aa96",
    fontSize: 17,
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
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  previewAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f1b16",
  },
  draftRow: {
    gap: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eadfce",
  },
  draftMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
  },
  errorCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fbeee4",
    borderWidth: 1,
    borderColor: "#d9a98c",
    gap: 6,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8b3a1a",
    fontWeight: "600",
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
