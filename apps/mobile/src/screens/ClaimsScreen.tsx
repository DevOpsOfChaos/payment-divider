import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type {
  ClaimDirection,
  CounterpartyKind,
  EntityId,
  PersonBalanceOverview,
  PersonBalancePosition,
} from "@payment-divider/core";

import { claimsData, formatMoney, useLedgerVersion, type ClaimListItem } from "../data";
import { formatServiceMessage } from "../i18n/service-message";

// Parses German money input like "12,50" into integer cents.
function parseAmount(rawText: string): number | undefined {
  const normalized = rawText.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined;
  }
  return Math.round(Number.parseFloat(normalized) * 100);
}

const LIFECYCLE_KEYS = {
  open: "claims.lifecycle.open",
  partially_paid: "claims.lifecycle.partiallyPaid",
  settled: "claims.lifecycle.settled",
  disputed: "claims.lifecycle.disputed",
  archived: "claims.lifecycle.archived",
} as const;

type LifecycleKey = keyof typeof LIFECYCLE_KEYS;

const DAY_MS = 24 * 60 * 60 * 1000;

// Reminder targets: "morgen" from now, snooze one day after the current
// reminder time (never earlier than tomorrow). Reminders are personal memory
// aids — nothing is sent to anyone.
function reminderTomorrow(): string {
  return new Date(Date.now() + DAY_MS).toISOString();
}

function reminderSnoozeTarget(currentRemindAt: string): string {
  return new Date(
    Math.max(Date.now(), Date.parse(currentRemindAt)) + DAY_MS,
  ).toISOString();
}

function formatReminderTime(remindAt: string): string {
  return `${remindAt.slice(0, 10)} ${remindAt.slice(11, 16)}`;
}

const COUNTERPARTY_KIND_KEYS = {
  app_user: "claims.counterpartyKind.appUser",
  invited_person: "claims.counterpartyKind.invitedPerson",
  external_person: "claims.counterpartyKind.externalPerson",
} as const satisfies Record<CounterpartyKind, string>;

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

function usePositionLabel(): (position: PersonBalancePosition) => string {
  const { t } = useTranslation();
  return (position) => {
    if (position.sourceType === "group_balance") {
      return `${t("claims.position.groupBalance")} ${position.label ?? position.sourceId}`;
    }
    return position.label ?? t("claims.position.noPurpose");
  };
}

// One person row: net summary up front, gross positions on demand. Closed
// positions stay reachable as history but never count into the net.
function PersonOverviewRow({ overview }: { overview: PersonBalanceOverview }) {
  const { t } = useTranslation();
  const positionLabel = usePositionLabel();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.personRow}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)}>
        <View style={styles.summaryRow}>
          <Text style={styles.claimName}>
            {overview.counterpartyName} {expanded ? "▾" : "▸"}
          </Text>
          <Text
            style={[styles.claimAmount, overview.netAmount < 0 && styles.amountNegative]}
          >
            {overview.netAmount >= 0
              ? `+${formatMoney(overview.netAmount)}`
              : `-${formatMoney(Math.abs(overview.netAmount))}`}
          </Text>
        </View>
        <Text style={styles.claimMeta}>
          {overview.netAmount > 0
            ? t("claims.personSection.netReceivable")
            : overview.netAmount < 0
              ? t("claims.personSection.netOwed")
              : t("claims.personSection.netSettled")}
          {" · "}
          {formatMoney(overview.openOwedToMe)} {t("claims.personSection.openForYou")} ·{" "}
          {formatMoney(overview.openOwedByMe)} {t("claims.personSection.openFromYou")}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.detailBlock}>
          {overview.openPositions.map((position) => (
            <Text
              key={`${position.sourceType}:${position.sourceId}:${position.direction}`}
              style={styles.detailLine}
            >
              {position.direction === "owed_to_me" ? "+" : "-"}
              {formatMoney(position.amount)} · {positionLabel(position)}
              {position.sourceType === "private_claim"
                ? ` · ${t("claims.position.claimSuffix")}`
                : ""}
            </Text>
          ))}
          {overview.closedPositions.length > 0 ? (
            <>
              <Text style={styles.detailTitle}>
                {t("claims.personSection.historyTitle", {
                  n: overview.closedPositions.length,
                })}
              </Text>
              {overview.closedPositions.map((position) => (
                <Text
                  key={`closed:${position.sourceType}:${position.sourceId}:${position.direction}`}
                  style={styles.detailLine}
                >
                  {formatMoney(position.amount)} · {positionLabel(position)} ·{" "}
                  {t("claims.position.done")}
                </Text>
              ))}
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ClaimCard({ item }: { item: ClaimListItem }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [paymentText, setPaymentText] = useState("");
  const { claim } = item;

  const directionLabel =
    claim.direction === "owed_to_me" ? t("claims.card.owesYou") : t("claims.card.youOwe");
  const counterpartyDisplay = item.counterpartyName;
  const groupName = item.groupName;
  const paymentAmount = parseAmount(paymentText);
  const canReact = item.canReact;
  const reminder = item.reminder;

  return (
    <View style={styles.claimCard}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)}>
        <View style={styles.claimHeader}>
          <Text style={styles.claimName}>
            {counterpartyDisplay} {item.incoming ? t("claims.card.demands") : directionLabel}
          </Text>
          <Text style={styles.claimAmount}>{formatMoney(item.remaining)}</Text>
        </View>
        <Text style={styles.claimMeta}>
          {claim.purpose ?? t("claims.card.noPurpose")} · {claim.claimDate}
          {claim.dueDate ? ` · ${t("claims.card.dueAt", { date: claim.dueDate })}` : ""}
          {groupName ? ` · ${groupName}` : ""}
        </Text>
        <View style={styles.badgeRow}>
          {item.counterparty ? (
            <Text style={styles.badge}>{t(COUNTERPARTY_KIND_KEYS[item.counterparty.kind])}</Text>
          ) : null}
          {item.lifecycle in LIFECYCLE_KEYS ? (
            <Text style={styles.badge}>{t(LIFECYCLE_KEYS[item.lifecycle as LifecycleKey])}</Text>
          ) : null}
          {!item.linked ? (
            <Text style={styles.badge}>{t("claims.card.privateUnshared")}</Text>
          ) : null}
          {item.remaining < claim.amount ? (
            <Text style={styles.badge}>
              {t("claims.card.paidOf", {
                paid: formatMoney(claim.amount - item.remaining),
                total: formatMoney(claim.amount),
              })}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {canReact ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void claimsData.acknowledgeClaim(claim.id)}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>{t("claims.actions.acknowledge")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void claimsData.disputeClaim(claim.id)}
            style={styles.actionButtonSecondary}
          >
            <Text style={styles.actionButtonSecondaryText}>{t("claims.actions.dispute")}</Text>
          </Pressable>
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>{t("claims.payments.title")}</Text>
          {item.payments.length === 0 ? (
            <Text style={styles.detailLine}>{t("claims.payments.none")}</Text>
          ) : (
            item.payments.map((payment) => (
              <Text key={payment.id} style={styles.detailLine}>
                {payment.paymentDate} · {formatMoney(payment.amount)} ·{" "}
                {payment.confirmationStatus === "confirmed"
                  ? t("claims.payments.confirmed")
                  : payment.confirmationStatus === "pending_confirmation"
                    ? t("claims.payments.pendingConfirmation")
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
                placeholder={t("claims.payments.inputPlaceholder")}
                keyboardType="decimal-pad"
                accessibilityLabel={t("claims.payments.inputLabel")}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!paymentAmount}
                onPress={() => {
                  if (paymentAmount) {
                    void claimsData.recordClaimPayment(claim.id, paymentAmount);
                    setPaymentText("");
                  }
                }}
                style={styles.actionButton}
              >
                <Text style={styles.actionButtonText}>{t("claims.payments.record")}</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.detailTitle}>{t("claims.reminder.title")}</Text>
          {reminder ? (
            <>
              <Text style={styles.detailLine}>
                {formatReminderTime(reminder.remindAt)}
                {item.reminderDue ? ` · ${t("claims.reminder.dueSuffix")}` : ""}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    void claimsData.snoozeClaimReminder(
                      claim.id,
                      reminderSnoozeTarget(reminder.remindAt),
                    )
                  }
                  style={styles.actionButton}
                >
                  <Text style={styles.actionButtonText}>{t("claims.reminder.snooze")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void claimsData.disableClaimReminder(claim.id)}
                  style={styles.actionButtonSecondary}
                >
                  <Text style={styles.actionButtonSecondaryText}>
                    {t("claims.reminder.disable")}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : item.lifecycle !== "settled" && item.lifecycle !== "archived" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void claimsData.setClaimReminder(claim.id, reminderTomorrow())}
              style={styles.actionButtonSecondary}
            >
              <Text style={styles.actionButtonSecondaryText}>
                {t("claims.reminder.remindTomorrow")}
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.detailLine}>{t("claims.reminder.none")}</Text>
          )}

          <Text style={styles.detailTitle}>{t("claims.timeline.title")}</Text>
          {item.events.map((event) => (
            <Text key={event.id} style={styles.detailLine}>
              {event.createdAt.slice(0, 10)} · {event.eventType}
            </Text>
          ))}

          {!item.incoming && item.lifecycle !== "archived" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void claimsData.archiveClaim(claim.id)}
              style={styles.actionButtonSecondary}
            >
              <Text style={styles.actionButtonSecondaryText}>{t("claims.actions.archive")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ClaimsScreen() {
  const { t } = useTranslation();
  useLedgerVersion();
  const overview = claimsData.getClaimsOverview();
  const statusHint = claimsData.getClaimsStatusHint();
  const groupOptions = claimsData.getClaimGroupOptions();
  // Rows with only closed positions stay listed so the history remains reachable.
  const personOverviews = claimsData.getPersonBalanceOverview().filter(
    (personOverview) =>
      personOverview.openPositions.length > 0 || personOverview.closedPositions.length > 0,
  );
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
  const existingCounterparties = claimsData.getCounterparties();

  async function save() {
    const amount = parseAmount(amountText);
    if (!amount || amount <= 0) {
      setFormError(t("claims.form.errorAmount"));
      return;
    }
    if (!selectedCounterpartyId && name.trim().length === 0) {
      setFormError(t("claims.form.errorPerson"));
      return;
    }

    const result = await claimsData.addClaim({
      direction,
      counterpartyId: selectedCounterpartyId,
      newCounterparty: selectedCounterpartyId
        ? undefined
        : { kind: newPersonKind, displayName: name.trim() },
      amount,
      purpose: purpose.trim() || undefined,
      groupId,
    });
    if (!result.ok) {
      setFormError(formatServiceMessage(t, result.message));
      return;
    }
    setName("");
    setAmountText("");
    setPurpose("");
    setFormError(undefined);
  }

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{t("claims.title")}</Text>
      <Text style={styles.screenPurpose}>{t("claims.purpose")}</Text>
      {statusHint ? <Text style={styles.compactHint}>{statusHint}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("claims.personSection.title")}</Text>
        <View style={styles.sectionCard}>
          {personOverviews.length === 0 ? (
            <Text style={styles.detailLine}>{t("claims.personSection.empty")}</Text>
          ) : (
            personOverviews.map((personOverview) => (
              <PersonOverviewRow
                key={`${personOverview.currency}:${personOverview.counterpartyId}`}
                overview={personOverview}
              />
            ))
          )}
        </View>
        <Text style={styles.compactHint}>{t("claims.personSection.hint")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("claims.form.title")}</Text>
        <View style={styles.sectionCard}>
          <View style={styles.chipRow}>
            <Chip
              label={t("claims.form.owedToMe")}
              active={direction === "owed_to_me"}
              onPress={() => setDirection("owed_to_me")}
            />
            <Chip
              label={t("claims.form.owedByMe")}
              active={direction === "owed_by_me"}
              onPress={() => setDirection("owed_by_me")}
            />
          </View>
          <View style={styles.chipRow}>
            {existingCounterparties.map((counterparty) => (
              <Chip
                key={counterparty.id}
                label={`${counterparty.displayName} · ${t(COUNTERPARTY_KIND_KEYS[counterparty.kind])}`}
                active={selectedCounterpartyId === counterparty.id}
                onPress={() => setSelectedCounterpartyId(counterparty.id)}
              />
            ))}
            <Chip
              label={t("claims.form.newPerson")}
              active={selectedCounterpartyId === undefined}
              onPress={() => setSelectedCounterpartyId(undefined)}
            />
          </View>
          {selectedCounterpartyId === undefined ? (
            <>
              <View style={styles.chipRow}>
                <Chip
                  label={t("claims.form.externalPrivate")}
                  active={newPersonKind === "external_person"}
                  onPress={() => setNewPersonKind("external_person")}
                />
                <Chip
                  label={t("claims.form.invitedLinkLater")}
                  active={newPersonKind === "invited_person"}
                  onPress={() => setNewPersonKind("invited_person")}
                />
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t("claims.form.namePlaceholder")}
                accessibilityLabel={t("claims.form.nameLabel")}
              />
            </>
          ) : null}
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={setAmountText}
            placeholder={t("claims.form.amountPlaceholder")}
            keyboardType="decimal-pad"
            accessibilityLabel={t("claims.form.amountLabel")}
          />
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder={t("claims.form.purposePlaceholder")}
            accessibilityLabel={t("claims.form.purposeLabel")}
          />
          <View style={styles.chipRow}>
            <Chip
              label={t("claims.form.withoutGroup")}
              active={!groupId}
              onPress={() => setGroupId(undefined)}
            />
            {groupOptions.map((group) => (
              <Chip
                key={group.id}
                label={group.name}
                active={groupId === group.id}
                onPress={() => setGroupId(group.id)}
              />
            ))}
          </View>
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={() => void save()} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t("claims.form.save")}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("claims.sections.open")}</Text>
        {overview.openClaims.map((item) => (
          <ClaimCard key={item.claim.id} item={item} />
        ))}
      </View>

      {overview.closedClaims.length > 0 ? (
        <View style={styles.section}>
          <Pressable accessibilityRole="button" onPress={() => setShowClosed(!showClosed)}>
            <Text style={styles.sectionLabel}>
              {t("claims.sections.closed", { n: overview.closedClaims.length })}{" "}
              {showClosed ? "▾" : "▸"}
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
  personRow: {
    gap: 6,
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
