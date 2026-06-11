import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { ClaimDirection, CounterpartyKind, EntityId } from "@payment-divider/core";

import { formatMoney, useLedgerVersion } from "../data";
import {
  acknowledgeClaim,
  addClaim,
  archiveClaim,
  disputeClaim,
  getClaimsOverview,
  getCounterparties,
  getOrCreateCounterparty,
  recordClaimPayment,
  type ClaimListItem,
} from "../data/claims-store";
import { MOCK_GROUPS, MOCK_USERS, MOCK_CURRENT_USER_ID } from "../mock-data/ledger";

// Parses German money input like "12,50" into integer cents.
function parseAmount(rawText: string): number | undefined {
  const normalized = rawText.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined;
  }
  return Math.round(Number.parseFloat(normalized) * 100);
}

const LIFECYCLE_LABELS: Record<string, string> = {
  open: "offen",
  partially_paid: "teilweise bezahlt",
  settled: "erledigt",
  disputed: "Klärung nötig",
  archived: "archiviert",
};

const COUNTERPARTY_LABELS: Record<CounterpartyKind, string> = {
  app_user: "App-Kontakt",
  invited_person: "Einladung",
  external_person: "Extern",
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ClaimCard({ item }: { item: ClaimListItem }) {
  const [expanded, setExpanded] = useState(false);
  const [paymentText, setPaymentText] = useState("");
  const { claim } = item;

  const directionLabel =
    claim.direction === "owed_to_me" ? "schuldet dir" : "du schuldest";
  const counterpartyDisplay = item.incoming
    ? MOCK_USERS.find((user) => user.id === claim.creatorUserId)?.displayName ??
      claim.creatorUserId
    : item.counterparty?.displayName ?? claim.counterpartyId;
  const groupName = claim.groupId
    ? MOCK_GROUPS.find((group) => group.id === claim.groupId)?.name
    : undefined;
  const paymentAmount = parseAmount(paymentText);
  const canReact =
    item.incoming &&
    item.counterparty?.linkedUserId === MOCK_CURRENT_USER_ID &&
    (claim.status === "linked_open" || claim.status === "disputed");

  return (
    <View style={styles.claimCard}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)}>
        <View style={styles.claimHeader}>
          <Text style={styles.claimName}>
            {counterpartyDisplay} {item.incoming ? "fordert" : directionLabel}
          </Text>
          <Text style={styles.claimAmount}>{formatMoney(item.remaining)}</Text>
        </View>
        <Text style={styles.claimMeta}>
          {claim.purpose ?? "Ohne Zweck"} · {claim.claimDate}
          {claim.dueDate ? ` · fällig ${claim.dueDate}` : ""}
          {groupName ? ` · ${groupName}` : ""}
        </Text>
        <View style={styles.badgeRow}>
          {item.counterparty ? (
            <Text style={styles.badge}>{COUNTERPARTY_LABELS[item.counterparty.kind]}</Text>
          ) : null}
          <Text style={styles.badge}>{LIFECYCLE_LABELS[item.lifecycle]}</Text>
          {!item.linked ? <Text style={styles.badge}>nur lokal · privat</Text> : null}
          {item.remaining < claim.amount ? (
            <Text style={styles.badge}>
              {formatMoney(claim.amount - item.remaining)} von {formatMoney(claim.amount)} bezahlt
            </Text>
          ) : null}
        </View>
      </Pressable>

      {canReact ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => acknowledgeClaim(claim.id)}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>bestätigen</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => disputeClaim(claim.id)}
            style={styles.actionButtonSecondary}
          >
            <Text style={styles.actionButtonSecondaryText}>ablehnen · Klärung nötig</Text>
          </Pressable>
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>Teilzahlungen</Text>
          {item.payments.length === 0 ? (
            <Text style={styles.detailLine}>Noch keine Teilzahlungen.</Text>
          ) : (
            item.payments.map((payment) => (
              <Text key={payment.id} style={styles.detailLine}>
                {payment.paymentDate} · {formatMoney(payment.amount)} ·{" "}
                {payment.confirmationStatus === "confirmed"
                  ? "bestätigt"
                  : payment.confirmationStatus === "pending_confirmation"
                    ? "Bestätigung offen"
                    : payment.confirmationStatus}
              </Text>
            ))
          )}

          {item.lifecycle !== "settled" && item.lifecycle !== "archived" ? (
            <View style={styles.paymentRow}>
              <TextInput
                style={styles.paymentInput}
                value={paymentText}
                onChangeText={setPaymentText}
                placeholder="z. B. 5,00"
                keyboardType="decimal-pad"
                accessibilityLabel="Teilzahlung"
              />
              <Pressable
                accessibilityRole="button"
                disabled={!paymentAmount}
                onPress={() => {
                  if (paymentAmount) {
                    recordClaimPayment(claim.id, paymentAmount);
                    setPaymentText("");
                  }
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>Teilzahlung erfassen</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.detailTitle}>Timeline</Text>
          {item.events.map((event) => (
            <Text key={event.id} style={styles.detailLine}>
              {event.createdAt.slice(0, 10)} · {event.eventType}
            </Text>
          ))}

          {!item.incoming && item.lifecycle !== "archived" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => archiveClaim(claim.id)}
              style={styles.actionButtonSecondary}
            >
              <Text style={styles.actionButtonSecondaryText}>archivieren</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ClaimsScreen() {
  useLedgerVersion();
  const overview = getClaimsOverview();
  const [showClosed, setShowClosed] = useState(false);
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [purpose, setPurpose] = useState("");
  const [direction, setDirection] = useState<ClaimDirection>("owed_to_me");
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<EntityId | undefined>(
    undefined,
  );
  const [newPersonKind, setNewPersonKind] = useState<
    "invited_person" | "external_person"
  >("external_person");
  const [groupId, setGroupId] = useState<EntityId | undefined>(undefined);
  const [formError, setFormError] = useState<string | undefined>(undefined);

  // Existing reusable person records: pick one or create a new private one.
  const existingCounterparties = getCounterparties();

  function save() {
    const amount = parseAmount(amountText);
    if (!amount || amount <= 0) {
      setFormError("Betrag muss größer als 0 sein.");
      return;
    }

    let counterpartyId = selectedCounterpartyId;
    if (!counterpartyId) {
      if (name.trim().length === 0) {
        setFormError("Vorhandene Person wählen oder Name eingeben.");
        return;
      }
      counterpartyId = getOrCreateCounterparty({
        kind: newPersonKind,
        displayName: name.trim(),
      }).id;
    }

    addClaim({
      direction,
      counterpartyId,
      amount,
      purpose: purpose.trim() || undefined,
      groupId,
    });
    setName("");
    setAmountText("");
    setPurpose("");
    setFormError(undefined);
  }

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>Forderungen</Text>
      <Text style={styles.screenPurpose}>
        Private Schuldennotizen: nur lokal, keine Zahlungsausführung, keine Mahnungen.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Pro Person</Text>
        <View style={styles.sectionCard}>
          {overview.summaries.length === 0 ? (
            <Text style={styles.detailLine}>Keine offenen Positionen.</Text>
          ) : (
            overview.summaries.map((summary) => (
              <View key={`${summary.currency}:${summary.counterpartyKey}`} style={styles.summaryRow}>
                <Text style={styles.claimName}>{summary.counterpartyName}</Text>
                <Text
                  style={[
                    styles.claimAmount,
                    summary.netAmount < 0 && styles.amountNegative,
                  ]}
                >
                  {summary.netAmount >= 0
                    ? `+${formatMoney(summary.netAmount)}`
                    : `-${formatMoney(Math.abs(summary.netAmount))}`}
                </Text>
              </View>
            ))
          )}
        </View>
        <Text style={styles.compactHint}>
          Offene private Forderungen und Schulden, netto pro Person. Gruppensalden bleiben getrennt.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Neue Forderung</Text>
        <View style={styles.sectionCard}>
          <View style={styles.chipRow}>
            <Chip
              label="Mir wird geschuldet"
              active={direction === "owed_to_me"}
              onPress={() => setDirection("owed_to_me")}
            />
            <Chip
              label="Ich schulde"
              active={direction === "owed_by_me"}
              onPress={() => setDirection("owed_by_me")}
            />
          </View>
          <View style={styles.chipRow}>
            {existingCounterparties.map((counterparty) => (
              <Chip
                key={counterparty.id}
                label={`${counterparty.displayName} · ${COUNTERPARTY_LABELS[counterparty.kind]}`}
                active={selectedCounterpartyId === counterparty.id}
                onPress={() => setSelectedCounterpartyId(counterparty.id)}
              />
            ))}
            <Chip
              label="Neue Person"
              active={selectedCounterpartyId === undefined}
              onPress={() => setSelectedCounterpartyId(undefined)}
            />
          </View>
          {selectedCounterpartyId === undefined ? (
            <>
              <View style={styles.chipRow}>
                <Chip
                  label="Extern (bleibt privat)"
                  active={newPersonKind === "external_person"}
                  onPress={() => setNewPersonKind("external_person")}
                />
                <Chip
                  label="Einladung (später verknüpfen)"
                  active={newPersonKind === "invited_person"}
                  onPress={() => setNewPersonKind("invited_person")}
                />
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Name · wird als Person wiederverwendbar gespeichert"
                accessibilityLabel="Name"
              />
            </>
          ) : null}
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="Betrag, z. B. 12,50"
            keyboardType="decimal-pad"
            accessibilityLabel="Betrag"
          />
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Zweck (optional)"
            accessibilityLabel="Zweck"
          />
          <View style={styles.chipRow}>
            <Chip label="Ohne Gruppe" active={!groupId} onPress={() => setGroupId(undefined)} />
            {MOCK_GROUPS.map((group) => (
              <Chip
                key={group.id}
                label={group.name}
                active={groupId === group.id}
                onPress={() => setGroupId(group.id)}
              />
            ))}
          </View>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={save} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Forderung lokal speichern</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Offene Forderungen</Text>
        {overview.openClaims.map((item) => (
          <ClaimCard key={item.claim.id} item={item} />
        ))}
      </View>

      {overview.closedClaims.length > 0 ? (
        <View style={styles.section}>
          <Pressable accessibilityRole="button" onPress={() => setShowClosed(!showClosed)}>
            <Text style={styles.sectionLabel}>
              Abgeschlossen ({overview.closedClaims.length}) {showClosed ? "▾" : "▸"}
            </Text>
          </Pressable>
          {showClosed
            ? overview.closedClaims.map((item) => <ClaimCard key={item.claim.id} item={item} />)
            : null}
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
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  claimCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 10,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  claimName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
    flexShrink: 1,
  },
  claimAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#236a4b",
  },
  amountNegative: {
    color: "#8b3a1a",
  },
  claimMeta: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  badge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6f6658",
    backgroundColor: "#eae3d6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#b8aa96",
    backgroundColor: "#fffdf8",
  },
  chipActive: {
    backgroundColor: "#1f1b16",
    borderColor: "#1f1b16",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4f463b",
  },
  chipTextActive: {
    color: "#fffaf0",
  },
  input: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#b8aa96",
    fontSize: 15,
    color: "#1f1b16",
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8b3a1a",
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#1f1b16",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fffaf0",
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1f1b16",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fffaf0",
  },
  actionButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8b3a1a",
    alignItems: "center",
  },
  actionButtonSecondaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8b3a1a",
  },
  detailBlock: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#eadfce",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f1b16",
  },
  detailLine: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
  },
  paymentRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  paymentInput: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#b8aa96",
    fontSize: 14,
    color: "#1f1b16",
  },
  compactHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
  },
});
