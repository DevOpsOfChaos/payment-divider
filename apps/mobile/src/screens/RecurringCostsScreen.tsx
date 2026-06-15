import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  getActiveParticipants,
  getPeriodRange,
  splitPeriodShares,
  type CostPlan,
  type CostPlanParticipant,
} from "@payment-divider/core";

import { formatMoney } from "../data";
import { MOCK_COUNTERPARTIES } from "../mock-data/claims";
import { MOCK_COST_PLAN_PARTICIPANTS, MOCK_COST_PLANS } from "../mock-data/recurring-costs";

// Returns the period index whose start <= today, or 0 if anchor is in the future.
function getCurrentPeriodIndex(plan: CostPlan, today: string): number {
  let index = 0;
  while (true) {
    const next = getPeriodRange(plan, index + 1);
    if (next.periodStart > today) break;
    index++;
    if (index > 1200) break; // guard for custom_days with many periods
  }
  return index;
}

const counterpartyNameMap = new Map(
  MOCK_COUNTERPARTIES.map((cp) => [cp.id, cp.displayName]),
);

function participantName(counterpartyId: string): string {
  return counterpartyNameMap.get(counterpartyId) ?? counterpartyId;
}

function CostPlanCard({
  plan,
  participants,
}: {
  plan: CostPlan;
  participants: CostPlanParticipant[];
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const periodIndex = getCurrentPeriodIndex(plan, today);
  const periodRange = getPeriodRange(plan, periodIndex);
  const activeParticipants = getActiveParticipants(participants, periodIndex);
  const shares = splitPeriodShares(plan.amount, activeParticipants);

  const intervalLabel =
    plan.intervalKind === "monthly"
      ? t("recurringCosts.interval.monthly")
      : plan.intervalKind === "yearly"
        ? t("recurringCosts.interval.yearly")
        : t("recurringCosts.interval.customDays", { n: plan.intervalDays ?? "?" });

  const statusLabel = plan.archivedAt
    ? t("recurringCosts.status.archived")
    : t("recurringCosts.status.active");

  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" onPress={() => setExpanded(!expanded)}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>
            {plan.name} {expanded ? "▾" : "▸"}
          </Text>
          <Text style={styles.cardAmount}>{formatMoney(plan.amount)}</Text>
        </View>
        <Text style={styles.cardMeta}>
          {intervalLabel} · {t("recurringCosts.card.anchorDate")}: {plan.anchorDate} ·{" "}
          {plan.currency}
        </Text>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{statusLabel}</Text>
          {plan.prepaid ? <Text style={styles.badge}>{t("recurringCosts.card.prepaid")}</Text> : null}
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailTitle}>
            {t("recurringCosts.card.participants")}
          </Text>
          {activeParticipants.length === 0 ? (
            <Text style={styles.detailLine}>{t("recurringCosts.card.noParticipants")}</Text>
          ) : (
            activeParticipants.map((p) => (
              <Text key={p.id} style={styles.detailLine}>
                {participantName(p.counterpartyId)} ·{" "}
                {p.shareType === "equal"
                  ? t("recurringCosts.card.shareType.equal")
                  : `${t("recurringCosts.card.shareType.fixed")}: ${formatMoney(p.shareValue ?? 0)}`}
              </Text>
            ))
          )}

          <Text style={styles.detailTitle}>
            {t("recurringCosts.card.periodPreview")}
          </Text>
          <Text style={styles.detailLine}>
            {periodRange.periodStart} – {periodRange.periodEnd}
          </Text>
          {shares.map((entry, i) => (
            <Text key={i} style={styles.detailLine}>
              {entry.counterpartyId
                ? participantName(entry.counterpartyId)
                : t("recurringCosts.card.ownerShare")}
              {": "}
              {formatMoney(entry.amount)}
            </Text>
          ))}

          <Text style={styles.previewNote}>{t("recurringCosts.card.previewNote")}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function RecurringCostsScreen() {
  const { t } = useTranslation();
  const [showArchived, setShowArchived] = useState(false);

  const activePlans = MOCK_COST_PLANS.filter((p) => !p.archivedAt);
  const archivedPlans = MOCK_COST_PLANS.filter((p) => !!p.archivedAt);

  function participantsFor(planId: string) {
    return MOCK_COST_PLAN_PARTICIPANTS.filter((p) => p.costPlanId === planId);
  }

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{t("recurringCosts.title")}</Text>
      <Text style={styles.screenPurpose}>{t("recurringCosts.purpose")}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("recurringCosts.sections.active")}</Text>
        {activePlans.length === 0 ? (
          <Text style={styles.emptyHint}>{t("recurringCosts.card.empty")}</Text>
        ) : (
          activePlans.map((plan) => (
            <CostPlanCard
              key={plan.id}
              plan={plan}
              participants={participantsFor(plan.id)}
            />
          ))
        )}
      </View>

      {archivedPlans.length > 0 ? (
        <View style={styles.section}>
          <Pressable accessibilityRole="button" onPress={() => setShowArchived(!showArchived)}>
            <Text style={styles.sectionLabel}>
              {t("recurringCosts.sections.archived", { n: archivedPlans.length })}{" "}
              {showArchived ? "▾" : "▸"}
            </Text>
          </Pressable>
          {showArchived
            ? archivedPlans.map((plan) => (
                <CostPlanCard
                  key={plan.id}
                  plan={plan}
                  participants={participantsFor(plan.id)}
                />
              ))
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
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
    flexShrink: 1,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#236a4b",
  },
  cardMeta: {
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
  previewNote: {
    fontSize: 12,
    lineHeight: 18,
    color: "#8b7a6a",
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 14,
    color: "#5b5247",
  },
});
