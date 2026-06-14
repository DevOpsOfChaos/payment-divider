import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { Pressable } from "react-native";

import {
  appRepositories,
  claimsData,
  confirmPaymentAction,
  formatMoney,
  markPaymentActionPaid,
  rejectPaymentAction,
  useLedgerVersion,
  type ClaimListItem,
  type SettlementActionKind,
  type SettlementItemData,
} from "../data";
import type { InboxItemMock } from "../mock-data/inbox";

const SETTLEMENT_ACTION_KEYS = {
  mark_paid: "inbox.settlement.actions.markPaid",
  confirm: "inbox.settlement.actions.confirm",
  reject: "inbox.settlement.actions.reject",
} as const satisfies Record<SettlementActionKind, string>;

function runSettlementAction(item: SettlementItemData, kind: SettlementActionKind): void {
  if (kind === "mark_paid") {
    markPaymentActionPaid(item.action);
  } else if (kind === "confirm") {
    confirmPaymentAction(item.action);
  } else {
    rejectPaymentAction(item.action);
  }
}

function SettlementCard({ item }: { item: SettlementItemData }) {
  const { t } = useTranslation();
  const direction =
    item.role === "payer"
      ? t("inbox.settlement.directionYouTo", { name: item.counterpartyName })
      : t("inbox.settlement.directionToYou", { name: item.counterpartyName });

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>
          {t("inbox.settlement.title")} · {direction}
        </Text>
        <Text style={styles.sourcePill}>{item.source}</Text>
      </View>

      <Text style={styles.itemDetail}>
        {formatMoney(item.action.amount)} · {t("inbox.settlement.ledgerOnly")}
      </Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>{t("inbox.labels.status")}</Text>
        <Text style={styles.metaValue}>{item.statusLabel}</Text>
      </View>

      {item.availableActions.map((kind) => (
        <Pressable
          key={kind}
          accessibilityRole="button"
          onPress={() => runSettlementAction(item, kind)}
          style={styles.settlementButton}
        >
          <Text style={styles.settlementButtonText}>{t(SETTLEMENT_ACTION_KEYS[kind])}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReminderCard({ item }: { item: ClaimListItem }) {
  const { t } = useTranslation();
  const purpose = item.claim.purpose ?? t("inbox.reminders.noPurpose");
  const dueDate = item.reminder?.remindAt.slice(0, 10) ?? "";
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{t("inbox.reminders.cardTitle")}</Text>
        <Text style={styles.sourcePill}>{item.counterpartyName}</Text>
      </View>
      <Text style={styles.itemDetail}>
        {purpose} · {formatMoney(item.claim.amount)}
      </Text>
      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>{t("inbox.reminders.dueAt", { date: dueDate })}</Text>
      </View>
    </View>
  );
}

function InboxCard({ title, detail, source, status, actionLabel }: InboxItemMock) {
  const { t } = useTranslation();
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.sourcePill}>{source}</Text>
      </View>

      <Text style={styles.itemDetail}>{detail}</Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>{t("inbox.labels.status")}</Text>
        <Text style={styles.metaValue}>{status}</Text>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.actionLabel}>{t("inbox.labels.action")}</Text>
        <Text style={styles.actionValue}>{actionLabel}</Text>
      </View>
    </View>
  );
}

export function InboxScreen() {
  useLedgerVersion();
  const { t } = useTranslation();
  const INBOX = appRepositories.getInbox();
  const settlementItems = appRepositories.getSettlementItems();
  const { openClaims } = claimsData.getClaimsOverview();
  const dueReminders = openClaims.filter((item) => item.reminderDue);

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{INBOX.title}</Text>
      <Text style={styles.screenPurpose}>{INBOX.subtitle}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{INBOX.summary}</Text>
      </View>

      {dueReminders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("inbox.reminders.sectionTitle")}</Text>
          {dueReminders.map((item) => (
            <ReminderCard key={item.claim.id} item={item} />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        {settlementItems.map((item) => (
          <SettlementCard key={item.action.id} item={item} />
        ))}
        {INBOX.items.map((item) => (
          <InboxCard key={`${item.title}-${item.source}`} {...item} />
        ))}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  screenPurpose: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f463b",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#5b5247",
  },
  section: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  itemHeader: {
    gap: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  sourcePill: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#eadfce",
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  itemDetail: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2f2922",
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8b3a1a",
  },
  actionRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eadfce",
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f1b16",
  },
  settlementButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1f1b16",
    alignItems: "center",
    justifyContent: "center",
  },
  settlementButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffaf0",
  },
});
